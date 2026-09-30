from sqlalchemy.ext.asyncio import AsyncSession
from models.transaction import Transaction
from schemas.transaction import TransactionCreate

async def create(db: AsyncSession, data: TransactionCreate, user_id: int) -> Transaction:
    new_transaction = Transaction(
        user_id=user_id,
        product_name=data.product_name,
        quantity=data.quantity,
        amount=data.amount
    )
    
    db.add(new_transaction)
    await db.commit()
    await db.refresh(new_transaction)
    
    return new_transaction