from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TransactionCreate(BaseModel):
    product_name: str
    quantity: int
    amount: float

class TransactionOut(BaseModel):
    id: int
    user_id: int
    product_name: str
    quantity: int
    amount: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)