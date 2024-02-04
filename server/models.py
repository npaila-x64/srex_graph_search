from pydantic import BaseModel
from typing import List

class PydanticNeighboursTerm(BaseModel):
    term: str
    frequency: float
    distance: float

class PydanticNeighboursTerms(BaseModel):
    neighbour_terms: List[PydanticNeighboursTerm]
