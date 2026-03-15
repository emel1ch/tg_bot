
import asyncio
from datetime import datetime, timedelta, timezone, time as dt_time

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    String,
    Time,
    DateTime,
    select,
)
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from config import DATABASE_URL

MSK_TZ = timezone(timedelta(hours=3))

class Base(DeclarativeBase):
    pass

# Таблица пользователей
# user_id, phone, root права
class User(Base):
    __tablename__ = "users"

    # Telegram user id
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_root: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(MSK_TZ))

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="user")


# Таблица записей
# order_id, user_id, date, time, place
# + флаги уведомлений
class Appointment(Base):
    __tablename__ = "appointments"

    order_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)

    appointment_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    appointment_time: Mapped[dt_time] = mapped_column(Time, nullable=False)

    # место = клиника
    place: Mapped[str] = mapped_column(String(255), nullable=False)

    # доп. поле для красивого отображения
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(50), nullable=False)

    notified_day_before: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notified_hour_before: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(MSK_TZ))

    user: Mapped["User"] = relationship(back_populates="appointments")


engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def create_or_update_user(user_id: int, phone: str | None = None, is_root: bool = False):
    async with async_session() as session:
        user = await session.get(User, user_id)

        if user is None:
            user = User(
                user_id=user_id,
                phone=phone,
                is_root=is_root
            )
            session.add(user)
        else:
            if phone:
                user.phone = phone

        await session.commit()


def parse_slot_start(slot_text: str) -> dt_time:
    # "08:00 - 10:00" -> 08:00
    start_str = slot_text.split("-")[0].strip()
    hour, minute = map(int, start_str.split(":"))
    return dt_time(hour=hour, minute=minute)


async def create_appointment(
    user_id: int,
    city: str,
    place: str,
    year: int,
    month: int,
    day: int,
    time_slot: str,
):
    async with async_session() as session:
        user = await session.get(User, user_id)
        if user is None:
            user = User(user_id=user_id)
            session.add(user)
            await session.flush()

        appointment = Appointment(
            user_id=user_id,
            city=city,
            place=place,
            appointment_date=datetime(year, month, day).date(),
            appointment_time=parse_slot_start(time_slot),
            time_slot=time_slot,
        )
        session.add(appointment)
        await session.commit()
        await session.refresh(appointment)
        return appointment


async def get_user_appointments(user_id: int):
    async with async_session() as session:
        stmt = (
            select(Appointment)
            .where(Appointment.user_id == user_id)
            .order_by(Appointment.appointment_date, Appointment.appointment_time)
        )
        result = await session.execute(stmt)
        return result.scalars().all()


async def get_due_day_reminders():
    async with async_session() as session:
        stmt = select(Appointment).where(Appointment.notified_day_before == False)
        result = await session.execute(stmt)
        appointments = result.scalars().all()

        now = datetime.now(MSK_TZ)
        due = []

        for appt in appointments:
            appt_dt = datetime.combine(
                appt.appointment_date,
                appt.appointment_time,
                tzinfo=MSK_TZ
            )
            delta = appt_dt - now

            # от 23 до 24 часов
            if timedelta(hours=23) <= delta <= timedelta(hours=24):
               due.append(appt)
            # проверка уведомлений
            #if timedelta(seconds=30) <= delta <= timedelta(minutes=2):
                #due.append(appt)

        return due


async def get_due_hour_reminders():
    async with async_session() as session:
        stmt = select(Appointment).where(Appointment.notified_hour_before == False)
        result = await session.execute(stmt)
        appointments = result.scalars().all()

        now = datetime.now(MSK_TZ)
        due = []

        for appt in appointments:
            appt_dt = datetime.combine(
                appt.appointment_date,
                appt.appointment_time,
                tzinfo=MSK_TZ
            )
            delta = appt_dt - now

            # от 59 до 60 минут
            if timedelta(minutes=59) <= delta <= timedelta(hours=1):
                due.append(appt)
            # Тест уведомлений
            #if timedelta(seconds=10) <= delta <= timedelta(minutes=1):
                #due.append(appt)

        return due


async def mark_day_reminded(order_id: int):
    async with async_session() as session:
        appt = await session.get(Appointment, order_id)
        if appt:
            appt.notified_day_before = True
            await session.commit()


async def mark_hour_reminded(order_id: int):
    async with async_session() as session:
        appt = await session.get(Appointment, order_id)
        if appt:
            appt.notified_hour_before = True
            await session.commit()