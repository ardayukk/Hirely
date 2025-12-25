from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
import uuid

from ..db import get_connection
from ..schemas.withdrawal import (
    WithdrawalMethodCreate,
    WithdrawalMethodPublic,
    WithdrawalRequest,
    WithdrawalPublic,
    WithdrawalWithMethod
)

router = APIRouter(prefix="/api/withdrawals", tags=["withdrawals"])

# Configuration
MIN_WITHDRAWAL_AMOUNT = Decimal("10.00")
WITHDRAWAL_FEE_PERCENT = Decimal("0.02")  # 2% fee
WITHDRAWAL_FEE_FIXED = Decimal("1.00")  # $1 fixed fee

def calculate_withdrawal_fee(amount: Decimal) -> Decimal:
    """Calculate withdrawal fee: 2% + $1 fixed"""
    if amount <= 0:
        raise ValueError("amount must be greater than 0")
    percentage_fee = amount * WITHDRAWAL_FEE_PERCENT
    total_fee = percentage_fee + WITHDRAWAL_FEE_FIXED
    return total_fee.quantize(Decimal("0.01"))

# ============================================
# WITHDRAWAL METHODS
# ============================================

@router.post("/methods", response_model=WithdrawalMethodPublic)
async def add_withdrawal_method(
    method: WithdrawalMethodCreate,
    freelancer_id: int = Query(...)
):
    """Add a new withdrawal method for a freelancer"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer exists
            await cur.execute(
                'SELECT user_id FROM "Freelancer" WHERE user_id = %s',
                (freelancer_id,)
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Freelancer not found")
            
            # If setting as default, unset other defaults
            if method.is_default:
                await cur.execute(
                    'UPDATE "WithdrawalMethod" SET is_default = FALSE WHERE freelancer_id = %s',
                    (freelancer_id,)
                )
            
            # Insert new method
            await cur.execute(
                '''
                INSERT INTO "WithdrawalMethod" 
                (freelancer_id, method_type, account_holder_name, account_number, 
                 bank_name, swift_code, paypal_email, is_default)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING method_id, freelancer_id, method_type, account_holder_name,
                          account_number, bank_name, swift_code, paypal_email, 
                          is_default, created_at
                ''',
                (
                    freelancer_id,
                    method.method_type,
                    method.account_holder_name,
                    method.account_number,
                    method.bank_name,
                    method.swift_code,
                    method.paypal_email,
                    method.is_default
                )
            )
            
            row = await cur.fetchone()
            await conn.commit()
            
            return WithdrawalMethodPublic(
                method_id=row[0],
                freelancer_id=row[1],
                method_type=row[2],
                account_holder_name=row[3],
                account_number=row[4],
                bank_name=row[5],
                swift_code=row[6],
                paypal_email=row[7],
                is_default=row[8],
                created_at=row[9]
            )

@router.get("/methods", response_model=List[WithdrawalMethodPublic])
async def get_withdrawal_methods(freelancer_id: int = Query(...)):
    """Get all withdrawal methods for a freelancer"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT method_id, freelancer_id, method_type, account_holder_name,
                       account_number, bank_name, swift_code, paypal_email, 
                       is_default, created_at
                FROM "WithdrawalMethod"
                WHERE freelancer_id = %s
                ORDER BY is_default DESC, created_at DESC
                ''',
                (freelancer_id,)
            )
            
            rows = await cur.fetchall()
            return [
                WithdrawalMethodPublic(
                    method_id=row[0],
                    freelancer_id=row[1],
                    method_type=row[2],
                    account_holder_name=row[3],
                    account_number=row[4],
                    bank_name=row[5],
                    swift_code=row[6],
                    paypal_email=row[7],
                    is_default=row[8],
                    created_at=row[9]
                )
                for row in rows
            ]

@router.delete("/methods/{method_id}")
async def delete_withdrawal_method(method_id: int, freelancer_id: int = Query(...)):
    """Delete a withdrawal method"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Check if method exists and belongs to freelancer
            await cur.execute(
                'SELECT method_id FROM "WithdrawalMethod" WHERE method_id = %s AND freelancer_id = %s',
                (method_id, freelancer_id)
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Withdrawal method not found")
            
            # Check if method is used in any pending withdrawals
            await cur.execute(
                '''
                SELECT withdrawal_id FROM "Withdrawal" 
                WHERE withdrawal_method_id = %s AND status IN ('pending', 'processing')
                ''',
                (method_id,)
            )
            if await cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete method with pending withdrawals"
                )
            
            await cur.execute(
                'DELETE FROM "WithdrawalMethod" WHERE method_id = %s',
                (method_id,)
            )
            await conn.commit()
            
            return {"message": "Withdrawal method deleted successfully"}

# ============================================
# WITHDRAWALS
# ============================================

@router.post("", response_model=WithdrawalPublic)
async def request_withdrawal(
    withdrawal: WithdrawalRequest,
    freelancer_id: int = Query(...)
):
    """Request a new withdrawal"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Validate minimum withdrawal amount
            if withdrawal.amount < MIN_WITHDRAWAL_AMOUNT:
                raise HTTPException(
                    status_code=400,
                    detail=f"Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT}"
                )
            
            # Verify withdrawal method exists and belongs to freelancer
            await cur.execute(
                '''
                SELECT method_id FROM "WithdrawalMethod" 
                WHERE method_id = %s AND freelancer_id = %s
                ''',
                (withdrawal.withdrawal_method_id, freelancer_id)
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Withdrawal method not found")
            
            # Get freelancer wallet balance
            await cur.execute(
                '''
                SELECT n.wallet_balance 
                FROM "NonAdmin" n
                INNER JOIN "Freelancer" f ON f.user_id = n.user_id
                WHERE f.user_id = %s
                ''',
                (freelancer_id,)
            )
            result = await cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Freelancer not found")
            
            wallet_balance = Decimal(str(result[0]))
            
            # Calculate fee and net amount
            fee = calculate_withdrawal_fee(withdrawal.amount)
            net_amount = withdrawal.amount - fee

            # Assertion: fee can't exceed amount (net payout must be non-negative)
            if fee < 0 or net_amount < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid fee calculation (fee exceeds amount)",
                )
            
            # Check sufficient balance
            if wallet_balance < withdrawal.amount:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. Available: ${wallet_balance}, Required: ${withdrawal.amount}"
                )
            
            # Create withdrawal record
            await cur.execute(
                '''
                INSERT INTO "Withdrawal"
                (freelancer_id, withdrawal_method_id, amount, fee, net_amount, status)
                VALUES (%s, %s, %s, %s, %s, 'pending')
                RETURNING withdrawal_id, freelancer_id, withdrawal_method_id, amount, fee,
                          net_amount, status, requested_at, processing_started_at, 
                          completed_at, notes, transaction_reference
                ''',
                (freelancer_id, withdrawal.withdrawal_method_id, withdrawal.amount, fee, net_amount)
            )
            
            row = await cur.fetchone()
            
            # Deduct amount from wallet
            await cur.execute(
                '''
                UPDATE "NonAdmin"
                SET wallet_balance = wallet_balance - %s
                WHERE user_id = %s AND wallet_balance >= %s
                ''',
                (withdrawal.amount, freelancer_id, withdrawal.amount)
            )

            # Assertion: protect against race conditions causing negative balances
            if cur.rowcount != 1:
                raise HTTPException(
                    status_code=400,
                    detail="Insufficient balance (concurrent update)",
                )
            
            await conn.commit()
            
            return WithdrawalPublic(
                withdrawal_id=row[0],
                freelancer_id=row[1],
                withdrawal_method_id=row[2],
                amount=row[3],
                fee=row[4],
                net_amount=row[5],
                status=row[6],
                requested_at=row[7],
                processing_started_at=row[8],
                completed_at=row[9],
                notes=row[10],
                transaction_reference=row[11]
            )

@router.get("", response_model=List[WithdrawalWithMethod])
async def get_withdrawals(
    freelancer_id: int = Query(...),
    status: Optional[str] = None
):
    """Get withdrawal history for a freelancer"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = '''
                SELECT w.withdrawal_id, w.freelancer_id, w.withdrawal_method_id, w.amount,
                       w.fee, w.net_amount, w.status, w.requested_at, w.processing_started_at,
                       w.completed_at, w.notes, w.transaction_reference,
                       wm.method_type, wm.account_holder_name, wm.bank_name, wm.paypal_email
                FROM "Withdrawal" w
                INNER JOIN "WithdrawalMethod" wm ON w.withdrawal_method_id = wm.method_id
                WHERE w.freelancer_id = %s
            '''
            params = [freelancer_id]
            
            if status:
                query += ' AND w.status = %s'
                params.append(status)
            
            query += ' ORDER BY w.requested_at DESC'
            
            await cur.execute(query, params)
            rows = await cur.fetchall()
            
            return [
                WithdrawalWithMethod(
                    withdrawal_id=row[0],
                    freelancer_id=row[1],
                    withdrawal_method_id=row[2],
                    amount=row[3],
                    fee=row[4],
                    net_amount=row[5],
                    status=row[6],
                    requested_at=row[7],
                    processing_started_at=row[8],
                    completed_at=row[9],
                    notes=row[10],
                    transaction_reference=row[11],
                    method_type=row[12],
                    account_holder_name=row[13],
                    bank_name=row[14],
                    paypal_email=row[15]
                )
                for row in rows
            ]

@router.get("/{withdrawal_id}", response_model=WithdrawalWithMethod)
async def get_withdrawal_detail(withdrawal_id: int, freelancer_id: int = Query(...)):
    """Get details of a specific withdrawal"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT w.withdrawal_id, w.freelancer_id, w.withdrawal_method_id, w.amount,
                       w.fee, w.net_amount, w.status, w.requested_at, w.processing_started_at,
                       w.completed_at, w.notes, w.transaction_reference,
                       wm.method_type, wm.account_holder_name, wm.bank_name, wm.paypal_email
                FROM "Withdrawal" w
                INNER JOIN "WithdrawalMethod" wm ON w.withdrawal_method_id = wm.method_id
                WHERE w.withdrawal_id = %s AND w.freelancer_id = %s
                ''',
                (withdrawal_id, freelancer_id)
            )
            
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Withdrawal not found")
            
            return WithdrawalWithMethod(
                withdrawal_id=row[0],
                freelancer_id=row[1],
                withdrawal_method_id=row[2],
                amount=row[3],
                fee=row[4],
                net_amount=row[5],
                status=row[6],
                requested_at=row[7],
                processing_started_at=row[8],
                completed_at=row[9],
                notes=row[10],
                transaction_reference=row[11],
                method_type=row[12],
                account_holder_name=row[13],
                bank_name=row[14],
                paypal_email=row[15]
            )

@router.patch("/{withdrawal_id}/cancel")
async def cancel_withdrawal(withdrawal_id: int, freelancer_id: int = Query(...)):
    """Cancel a pending withdrawal"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get withdrawal details
            await cur.execute(
                '''
                SELECT withdrawal_id, amount, status 
                FROM "Withdrawal"
                WHERE withdrawal_id = %s AND freelancer_id = %s
                ''',
                (withdrawal_id, freelancer_id)
            )
            
            result = await cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Withdrawal not found")
            
            status = result[2]
            if status not in ('pending', 'processing'):
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot cancel withdrawal with status: {status}"
                )
            
            amount = result[1]
            
            # Update withdrawal status
            await cur.execute(
                '''
                UPDATE "Withdrawal"
                SET status = 'cancelled'
                WHERE withdrawal_id = %s
                ''',
                (withdrawal_id,)
            )
            
            # Refund amount to wallet
            await cur.execute(
                '''
                UPDATE "NonAdmin"
                SET wallet_balance = wallet_balance + %s
                WHERE user_id = %s
                ''',
                (amount, freelancer_id)
            )
            
            await conn.commit()
            
            return {"message": "Withdrawal cancelled and amount refunded"}

# ============================================
# MOCK PROCESSING (Admin/System Function)
# ============================================

@router.patch("/{withdrawal_id}/process")
async def process_withdrawal(withdrawal_id: int):
    """
    Mock processing of a withdrawal (simulate payment gateway)
    In production, this would be triggered by background job
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get withdrawal
            await cur.execute(
                'SELECT withdrawal_id, status FROM "Withdrawal" WHERE withdrawal_id = %s',
                (withdrawal_id,)
            )
            result = await cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Withdrawal not found")
            
            status = result[1]
            if status != 'pending':
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot process withdrawal with status: {status}"
                )
            
            # Update to processing
            await cur.execute(
                '''
                UPDATE "Withdrawal"
                SET status = 'processing', processing_started_at = NOW()
                WHERE withdrawal_id = %s
                ''',
                (withdrawal_id,)
            )
            await conn.commit()
            
            return {"message": "Withdrawal processing started"}

@router.patch("/{withdrawal_id}/complete")
async def complete_withdrawal(withdrawal_id: int):
    """
    Mock completion of a withdrawal (simulate successful payment)
    In production, this would be callback from payment gateway
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get withdrawal
            await cur.execute(
                'SELECT withdrawal_id, status FROM "Withdrawal" WHERE withdrawal_id = %s',
                (withdrawal_id,)
            )
            result = await cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Withdrawal not found")
            
            status = result[1]
            if status != 'processing':
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot complete withdrawal with status: {status}"
                )
            
            # Generate mock transaction reference
            transaction_ref = f"TXN-{uuid.uuid4().hex[:12].upper()}"
            
            # Update to completed
            await cur.execute(
                '''
                UPDATE "Withdrawal"
                SET status = 'completed', 
                    completed_at = NOW(),
                    transaction_reference = %s,
                    notes = 'Mock payment processed successfully'
                WHERE withdrawal_id = %s
                ''',
                (transaction_ref, withdrawal_id)
            )
            await conn.commit()
            
            return {
                "message": "Withdrawal completed successfully",
                "transaction_reference": transaction_ref
            }
