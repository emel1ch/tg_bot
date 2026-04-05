import asyncio
from datetime import datetime, timedelta, timezone, time as dt_time, date as dt_date

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


# =========================
#        USERS
# =========================
class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_root: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(MSK_TZ))

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="user")


# =========================
#        DOCTORS
# =========================
class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clinic: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="doctor")
    weekly_rules: Mapped[list["DoctorWeeklySchedule"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")
    exceptions: Mapped[list["DoctorException"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")


class DoctorWeeklySchedule(Base):
    __tablename__ = "doctor_weekly_schedule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False)

    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Пн ... 6=Вс
    start_time: Mapped[dt_time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt_time] = mapped_column(Time, nullable=False)
    is_working: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    doctor: Mapped["Doctor"] = relationship(back_populates="weekly_rules")


class DoctorException(Base):
    __tablename__ = "doctor_exceptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False)

    exception_date: Mapped[dt_date] = mapped_column(Date, nullable=False)
    is_working: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    start_time: Mapped[dt_time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[dt_time | None] = mapped_column(Time, nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    doctor: Mapped["Doctor"] = relationship(back_populates="exceptions")


# =========================
#      APPOINTMENTS
# =========================
class Appointment(Base):
    __tablename__ = "appointments"

    order_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False)

    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    appointment_date: Mapped[dt_date] = mapped_column(Date, nullable=False)
    appointment_time: Mapped[dt_time] = mapped_column(Time, nullable=False)

    place: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(50), nullable=False)

    notified_day_before: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notified_hour_before: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(MSK_TZ))

    user: Mapped["User"] = relationship(back_populates="appointments")
    doctor: Mapped["Doctor"] = relationship(back_populates="appointments")


# =========================
#       ENGINE
# =========================
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# =========================
#       USERS
# =========================
async def create_or_update_user(user_id: int, phone: str | None = None, is_root: bool = False):
    async with async_session() as session:
        user = await session.get(User, user_id)

        if user is None:
            user = User(user_id=user_id, phone=phone, is_root=is_root)
            session.add(user)
        else:
            if phone:
                user.phone = phone

        await session.commit()


async def get_user_by_id(user_id: int):
    async with async_session() as session:
        return await session.get(User, user_id)


async def delete_user(user_id: int):
    async with async_session() as session:
        stmt = select(Appointment).where(Appointment.user_id == user_id)
        result = await session.execute(stmt)

        for appt in result.scalars().all():
            await session.delete(appt)

        user = await session.get(User, user_id)
        if user:
            await session.delete(user)

        await session.commit()


# =========================
#       DOCTORS
# =========================
async def create_doctor(clinic: str, full_name: str, specialty: str | None = None):
    async with async_session() as session:
        doctor = Doctor(clinic=clinic, full_name=full_name, specialty=specialty)
        session.add(doctor)
        await session.commit()
        await session.refresh(doctor)
        return doctor


async def get_doctors_by_clinic(clinic: str):
    async with async_session() as session:
        stmt = select(Doctor).where(Doctor.clinic == clinic, Doctor.is_active == True)
        result = await session.execute(stmt)
        return result.scalars().all()


async def get_doctor_by_id(doctor_id: int):
    async with async_session() as session:
        return await session.get(Doctor, doctor_id)


async def set_weekly_schedule(doctor_id: int, weekday: int, start_time: str, end_time: str, is_working=True):
    st_h, st_m = map(int, start_time.split(":"))
    en_h, en_m = map(int, end_time.split(":"))

    async with async_session() as session:
        rule = DoctorWeeklySchedule(
            doctor_id=doctor_id,
            weekday=weekday,
            start_time=dt_time(st_h, st_m),
            end_time=dt_time(en_h, en_m),
            is_working=is_working,
        )
        session.add(rule)
        await session.commit()


async def add_doctor_exception(doctor_id: int, exc_date: dt_date, is_working=False, start_time=None, end_time=None, note=None):
    st = en = None
    if start_time and end_time:
        st_h, st_m = map(int, start_time.split(":"))
        en_h, en_m = map(int, end_time.split(":"))
        st = dt_time(st_h, st_m)
        en = dt_time(en_h, en_m)

    async with async_session() as session:
        exc = DoctorException(
            doctor_id=doctor_id,
            exception_date=exc_date,
            is_working=is_working,
            start_time=st,
            end_time=en,
            note=note,
        )
        session.add(exc)
        await session.commit()


# =========================
#   AVAILABLE TIME SLOTS
# =========================
def parse_slot_start(slot_text: str) -> dt_time:
    start_str = slot_text.split("-")[0].strip()
    h, m = map(int, start_str.split(":"))
    return dt_time(h, m)


async def get_available_time_slots(doctor_id: int, year: int, month: int, day: int):
    target_date = dt_date(year, month, day)
    now = datetime.now(MSK_TZ)

    async with async_session() as session:
        # Проверяем исключения
        exc_stmt = select(DoctorException).where(
            DoctorException.doctor_id == doctor_id,
            DoctorException.exception_date == target_date
        )
        exc = (await session.execute(exc_stmt)).scalar_one_or_none()

        if exc:
            if not exc.is_working:
                return []
            rules = [(exc.start_time, exc.end_time)]
        else:
            weekday = target_date.weekday()
            stmt = select(DoctorWeeklySchedule).where(
                DoctorWeeklySchedule.doctor_id == doctor_id,
                DoctorWeeklySchedule.weekday == weekday,
                DoctorWeeklySchedule.is_working == True
            )
            rules = [(r.start_time, r.end_time) for r in (await session.execute(stmt)).scalars().all()]

    slots = []
    for start_t, end_t in rules:
        cur = datetime.combine(target_date, start_t)
        end_dt = datetime.combine(target_date, end_t)

        while cur + timedelta(hours=2) <= end_dt:
            nxt = cur + timedelta(hours=2)

            if target_date == now.date() and cur <= now:
                cur = nxt
                continue

            slots.append((f"{cur.strftime('%H:%M')} - {nxt.strftime('%H:%M')}", cur.time()))
            cur = nxt

    return slots


# =========================
#     APPOINTMENTS
# =========================
async def create_appointment(user_id, city, place, year, month, day, time_slot, doctor_id=None, doctor_name=None):
    async with async_session() as session:
        appointment = Appointment(
            user_id=user_id,
            doctor_id=doctor_id,
            doctor_name=doctor_name,
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
        stmt = select(Appointment).where(Appointment.user_id == user_id).order_by(
            Appointment.appointment_date, Appointment.appointment_time
        )
        result = await session.execute(stmt)
        return result.scalars().all()


# =========================
#    REMINDERS
# =========================
async def get_due_day_reminders():
    async with async_session() as session:
        stmt = select(Appointment).where(Appointment.notified_day_before == False)
        appointments = (await session.execute(stmt)).scalars().all()

        now = datetime.now(MSK_TZ)
        due = []

        for appt in appointments:
            appt_dt = datetime.combine(appt.appointment_date, appt.appointment_time, tzinfo=MSK_TZ)
            delta = appt_dt - now

            if timedelta(hours=23) <= delta <= timedelta(hours=24):
                due.append(appt)

        return due


async def get_due_hour_reminders():
    async with async_session() as session:
        stmt = select(Appointment).where(Appointment.notified_hour_before == False)
        appointments = (await session.execute(stmt)).scalars().all()

        now = datetime.now(MSK_TZ)
        due = []

        for appt in appointments:
            appt_dt = datetime.combine(appt.appointment_date, appt.appointment_time, tzinfo=MSK_TZ)
            delta = appt_dt - now

            if timedelta(minutes=59) <= delta <= timedelta(hours=1):
                due.append(appt)

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


# =========================
#    ADMIN
# =========================
async def get_all_users():
    async with async_session() as session:
        result = await session.execute(select(User))
        return result.scalars().all()


async def grant_admin_rights(user_id: int):
    async with async_session() as session:
        user = await session.get(User, user_id)
        if user:
            user.is_root = True
            await session.commit()
            return True
        return False

async def deactivate_doctor(doctor_id: int):
    async with async_session() as session:
        doctor = await session.get(Doctor, doctor_id)
        if doctor:
            doctor.is_active = False
            await session.commit()
            return True
        return False