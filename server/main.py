from models import PydanticNeighboursTerms
from services import queryService
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

print("Starting server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryTerm(BaseModel):
    query: str 

@app.post("/get-neighbour-terms")
async def get_neighbour_terms(queryTerm: QueryTerm) -> PydanticNeighboursTerms:
    return queryService.processQuery(queryTerm.query)
