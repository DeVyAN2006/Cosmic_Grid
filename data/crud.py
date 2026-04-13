from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from data.models import SolarReading, Forecast, RegionAlert, ActionPlan
from datetime import datetime
from typing import Optional


async def upsert_solar_reading(db: AsyncSession, reading: dict) -> Optional[SolarReading]:
    ts = datetime.fromisoformat(reading["timestamp"].replace("Z", "+00:00"))
    existing = await db.execute(select(SolarReading).where(SolarReading.timestamp == ts))
    if existing.scalar_one_or_none():
        return None
    record = SolarReading(
        timestamp=ts,
        proton_density=reading["proton_density"],
        sw_speed=reading["sw_speed"],
        proton_temp=reading["proton_temp"],
        bz_nT=reading["bz_nT"],
        flow_pressure=reading["flow_pressure"],
        ae_index=reading.get("ae_index", 100.0),
        symh_index=reading.get("symh_index", 0.0),
    )
    db.add(record)
    await db.flush()
    return record


async def get_latest_readings(db: AsyncSession, limit: int = 288) -> list:
    result = await db.execute(select(SolarReading).order_by(desc(SolarReading.timestamp)).limit(limit))
    return list(reversed(result.scalars().all()))


async def get_latest_reading(db: AsyncSession) -> Optional[SolarReading]:
    result = await db.execute(select(SolarReading).order_by(desc(SolarReading.timestamp)).limit(1))
    return result.scalar_one_or_none()


async def count_readings(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(SolarReading.id)))
    return result.scalar()


async def save_forecast(db: AsyncSession, fdata: dict, regions: list) -> Forecast:
    fc = Forecast(
        symh_predicted=fdata["symh_predicted"],
        storm_category=fdata["storm_category"],
        storm_label=fdata["storm_label"],
        confidence=fdata["confidence"],
        alert_level=fdata["alert_level"],
    )
    db.add(fc)
    await db.flush()
    for r in regions:
        db.add(RegionAlert(
            forecast_id=fc.id,
            region_id=r["id"],
            region_name=r["name"],
            country=r["country"],
            lat=r["lat"],
            line_km=r["line_km"],
            age_factor=r["age_factor"],
            risk_score=r["risk_score"],
            alert_level=r["alert_level"],
        ))
    return fc


async def get_latest_forecast(db: AsyncSession) -> Optional[Forecast]:
    result = await db.execute(select(Forecast).order_by(desc(Forecast.generated_at)).limit(1))
    return result.scalar_one_or_none()


async def get_forecast_history(db: AsyncSession, limit: int = 50) -> list:
    result = await db.execute(select(Forecast).order_by(desc(Forecast.generated_at)).limit(limit))
    return result.scalars().all()


async def get_regions_for_forecast(db: AsyncSession, fid: int) -> list:
    result = await db.execute(select(RegionAlert).where(RegionAlert.forecast_id == fid).order_by(desc(RegionAlert.risk_score)))
    return result.scalars().all()


async def get_region_history(db: AsyncSession, rid: str, limit: int = 100) -> list:
    result = await db.execute(select(RegionAlert).where(RegionAlert.region_id == rid).order_by(desc(RegionAlert.created_at)).limit(limit))
    return result.scalars().all()


async def save_action_plan(db: AsyncSession, rid: str, rname: str, alevel: str, rscore: float, ptext: str, mused: str = "llama3-8b-8192") -> ActionPlan:
    plan = ActionPlan(
        region_id=rid,
        region_name=rname,
        alert_level=alevel,
        risk_score=rscore,
        plan_text=ptext,
        model_used=mused,
    )
    db.add(plan)
    await db.flush()
    return plan


async def get_latest_action_plan(db: AsyncSession, rid: str) -> Optional[ActionPlan]:
    result = await db.execute(select(ActionPlan).where(ActionPlan.region_id == rid).order_by(desc(ActionPlan.generated_at)).limit(1))
    return result.scalar_one_or_none()