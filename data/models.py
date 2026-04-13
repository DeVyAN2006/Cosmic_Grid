from sqlalchemy import (
    Column, Integer, Float, String, DateTime,
    Text, Index, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from data.database import Base


class SolarReading(Base):
    __tablename__ = "solar_readings"

    id              = Column(Integer, primary_key=True, index=True)
    timestamp       = Column(DateTime(timezone=True), unique=True, nullable=False, index=True)
    proton_density  = Column(Float, nullable=False)
    sw_speed        = Column(Float, nullable=False)
    proton_temp     = Column(Float, nullable=False)
    bz_nT           = Column(Float, nullable=False)
    flow_pressure   = Column(Float, nullable=False)
    ae_index        = Column(Float, nullable=False, default=100.0)
    symh_index      = Column(Float, nullable=False, default=0.0)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class Forecast(Base):
    __tablename__ = "forecasts"

    id              = Column(Integer, primary_key=True, index=True)
    generated_at    = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    symh_predicted  = Column(Float, nullable=False)
    storm_category  = Column(Integer, nullable=False)
    storm_label     = Column(String(50), nullable=False)
    confidence      = Column(Float, nullable=False)
    alert_level     = Column(String(20), nullable=False)
    model_version   = Column(String(20), nullable=False, default="lstm_v1")

    region_alerts   = relationship(
        "RegionAlert",
        back_populates="forecast",
        cascade="all, delete-orphan"
    )


class RegionAlert(Base):
    __tablename__ = "region_alerts"

    id              = Column(Integer, primary_key=True, index=True)
    forecast_id     = Column(Integer, ForeignKey("forecasts.id", ondelete="CASCADE"), nullable=False, index=True)
    region_id       = Column(String(50), nullable=False, index=True)
    region_name     = Column(String(100), nullable=False)
    country         = Column(String(100), nullable=False)
    lat             = Column(Float, nullable=False)
    line_km         = Column(Integer, nullable=False)
    age_factor      = Column(Float, nullable=False)
    risk_score      = Column(Float, nullable=False)
    alert_level     = Column(String(20), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    forecast        = relationship("Forecast", back_populates="region_alerts")

    __table_args__ = (
        Index("ix_region_alerts_region_created", "region_id", "created_at"),
    )


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id              = Column(Integer, primary_key=True, index=True)
    region_id       = Column(String(50), nullable=False, index=True)
    region_name     = Column(String(100), nullable=False)
    alert_level     = Column(String(20), nullable=False)
    risk_score      = Column(Float, nullable=False)
    plan_text       = Column(Text, nullable=False)
    generated_at    = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    model_used      = Column(String(50), nullable=False, default="llama3-8b-8192")
