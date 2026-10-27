"""Simulations router — what-if rule relaxation projections (manager only)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager
from .. import models
from ..services import simulation as svc
from ..services.rules import rule_to_dict

router = APIRouter()


class SimulationCreate(BaseModel):
    name: str
    ruleId: str
    changeType: str
    currentValue: str = ""
    newValue: str = ""


@router.get("/simulations")
def list_simulations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[dict]:
    query = db.query(models.Simulation)
    if user.workspace:
        query = query.filter(
            (models.Simulation.workspace == user.workspace)
            | (models.Simulation.workspace.is_(None) if user.workspace == "PureGlow" else False)
        )
    rows = query.order_by(models.Simulation.created_at.desc()).all()
    return [svc.simulation_to_dict(s) for s in rows]


@router.post("/simulations")
def create_simulation(
    body: SimulationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_manager),
) -> dict:
    try:
        sim = svc.run_simulation(
            db,
            name=body.name,
            rule_id=body.ruleId,
            change_type=body.changeType,
            current_value=body.currentValue,
            new_value=body.newValue,
            user_id=user.id,
            workspace=user.workspace or "PureGlow",
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return svc.simulation_to_dict(sim)


@router.post("/simulations/{id}/activate")
def activate_simulation(
    id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_manager),
) -> dict:
    """Separate manager-only endpoint to activate proposed rule changes from a sandbox simulation."""
    try:
        rule, sim = svc.activate_simulation_proposal(db, id, user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "status": "activated",
        "rule": rule_to_dict(rule),
        "simulation": svc.simulation_to_dict(sim),
    }
