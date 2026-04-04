from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, JSON, Date, Time, Numeric,
    ForeignKey, Table, Index, Enum, CheckConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timedelta
from sqlalchemy import Enum

Base = declarative_base()

# Enums for field types and validation
FieldTypeValues = ('text', 'textarea', 'email', 'password', 'number',
                  'select', 'radio', 'checkbox', 'date', 'date_range',
                  'file', 'multi_select', 'dropdown', 'slider', 'signature',
                  'address', 'phone', 'currency', 'percentage', 'custom')

FormStatusValues = ('draft', 'active', 'archived', 'published')

FormPermissionValues = ('owner', 'editor', 'viewer', 'readonly')

form_collaborators = Table('form_collaborators', Base.metadata,
    Column('form_id', Integer, ForeignKey('forms.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True)
)

class User(Base):
    """User model for admin authentication."""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    forms = relationship("Form", foreign_keys="Form.created_by", back_populates="owner")
    shared_forms = relationship("Form", secondary=form_collaborators, back_populates="collaborators")

class Form(Base):
    """Main form model with schema flexibility."""
    __tablename__ = 'forms'

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(*FormStatusValues, name='form_status'), default='draft', index=True)
    theme_id = Column(Integer, ForeignKey('themes.id'), nullable=True)
    is_published = Column(Boolean, default=False)
    allow_anonymous = Column(Boolean, default=True)
    max_submissions = Column(Integer, nullable=True)
    submission_count = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Field storage (flexible schema)
    fields = Column(JSON, nullable=False)
    field_order = Column(JSON, nullable=False)
    conditions = Column(JSON, nullable=True)
    validations = Column(JSON, nullable=True)
    settings = Column(JSON, default={})

    # Relationships
    owner = relationship("User", foreign_keys=[created_by], back_populates="forms")
    editor = relationship("User", foreign_keys=[updated_by], backref="edited_forms")
    collaborators = relationship("User", secondary=form_collaborators, back_populates="shared_forms")
    theme = relationship("Theme", backref="forms")
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")
    analytics = relationship("Analytics", back_populates="form", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'active', 'archived', 'published')"),
    )

class Field(Base):
    """Individual form field model."""
    __tablename__ = 'fields'

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('forms.id'), nullable=False)
    field_type = Column(Enum(*FieldTypeValues, name='field_type'), nullable=False)
    field_name = Column(String(100), nullable=True)
    field_label = Column(String(255), nullable=False)
    placeholder = Column(String(255), nullable=True)
    is_required = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)
    options = Column(JSON, nullable=True)
    validation_rules = Column(JSON, nullable=True)
    position = Column(Integer, default=0)
    width = Column(Integer, default=100)
    min_width = Column(Integer, default=50)
    icon = Column(String(100), nullable=True)
    custom_css = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    form = relationship("Form", foreign_keys=[form_id], backref="fields_list")

    __table_args__ = (
        Index('idx_fields_form_id', 'form_id'),
    )

class Response(Base):
    """Form response model with flexible schema support."""
    __tablename__ = 'responses'

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('forms.id'), nullable=False)
    submission_data = Column(JSON, nullable=False)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(JSON, nullable=True)
    submission_status = Column(Enum('pending', 'submitted', 'rejected', name='submission_status'), default='pending')
    submitted_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    form = relationship("Form", foreign_keys=[form_id], back_populates="responses")
    author = relationship("User", foreign_keys=[submitted_by], backref="submissions")

    __table_args__ = (
        Index('idx_responses_form_id', 'form_id'),
        Index('idx_responses_submitted_at', 'submitted_at'),
    )

class Theme(Base):
    """Theme model for dynamic theming."""
    __tablename__ = 'themes'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    primary_color = Column(String(7), default='#3498db')
    secondary_color = Column(String(7), default='#2ecc71')
    accent_color = Column(String(7), default='#e74c3c')
    font_family = Column(String(100), default="'Inter', sans-serif")
    font_size = Column(Integer, default=16)
    font_weight = Column(String(10), default="400")
    line_height = Column(String(10), default="1.6")
    border_radius = Column(Integer, default=8)
    shadow = Column(String(100), default="0 2px 4px rgba(0,0,0,0.1)")
    background = Column(String(20), default='#ffffff')
    text_color = Column(String(20), default='#333333')
    success_color = Column(String(7), default='#27ae60')
    error_color = Column(String(7), default='#e74c3c')
    warning_color = Column(String(7), default='#f39c12')
    custom_styles = Column(Text, nullable=True)
    is_system_theme = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Condition(Base):
    """Conditional branching rules."""
    __tablename__ = 'conditions'

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('forms.id'), nullable=False)
    trigger_field = Column(String(100), nullable=False)
    trigger_value = Column(String(255), nullable=False)
    trigger_operator = Column(Enum('equals', 'not_equals', 'contains', 'does_not_contain', 'greater_than', 'less_than', 'between', name='trigger_operator'), nullable=False)
    target_field = Column(Integer, ForeignKey('fields.id'), nullable=True)
    target_action = Column(Enum('hide', 'show', 'enable', 'disable', 'validate', name='target_action'), nullable=False)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    form = relationship("Form", foreign_keys=[form_id], backref="conditions_list")

    __table_args__ = (
        Index('idx_conditions_form_id', 'form_id'),
    )

class AuditLog(Base):
    """Audit logging for form changes."""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('forms.id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String(50), nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index('idx_audit_logs_form_id', 'form_id'),
        Index('idx_audit_logs_user_id', 'user_id'),
        Index('idx_audit_logs_timestamp', 'timestamp'),
    )

class Analytics(Base):
    """Form analytics tracking."""
    __tablename__ = 'analytics'

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('forms.id'), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    form = relationship("Form", foreign_keys=[form_id], back_populates="analytics")

    __table_args__ = (
        Index('idx_analytics_form_id', 'form_id'),
        Index('idx_analytics_event_type', 'event_type'),
    )

class FileUpload(Base):
    """File uploads for forms."""
    __tablename__ = 'file_uploads'

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('forms.id'), nullable=False)
    field_id = Column(Integer, ForeignKey('fields.id'), nullable=True)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_upload_type = Column(Enum('image', 'video', 'file', 'signature', name='file_upload_type'), nullable=False)
    public_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    form = relationship("Form", foreign_keys=[form_id], backref="file_uploads")
    field = relationship("Field", foreign_keys=[field_id], backref="file_uploads")

    __table_args__ = (
        Index('idx_file_uploads_form_id', 'form_id'),
        Index('idx_file_uploads_field_id', 'field_id'),
    )

# Create table indexes
def create_indexes(engine):
    """Create database indexes."""
    from sqlalchemy import text

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_forms_title ON forms(title);
            CREATE INDEX IF NOT EXISTS idx_responses_submission_status ON responses(submission_status);
            CREATE INDEX IF NOT EXISTS idx_responses_ip_address ON responses(ip_address);
            CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(created_at DESC);
        """))
        conn.commit()
