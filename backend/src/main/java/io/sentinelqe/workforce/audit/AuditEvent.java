package io.sentinelqe.workforce.audit;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="audit_events")
public class AuditEvent {
    @Id private UUID id;
    @Column(name="actor_id") private UUID actorId;
    @Column(nullable=false,length=100) private String action;
    @Column(name="entity_type",nullable=false,length=80) private String entityType;
    @Column(name="entity_id",nullable=false) private UUID entityId;
    @Column(name="correlation_id",length=64) private String correlationId;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected AuditEvent(){}
    public AuditEvent(UUID actorId,String action,String entityType,UUID entityId,String correlationId){this.id=UUID.randomUUID();this.actorId=actorId;this.action=action;this.entityType=entityType;this.entityId=entityId;this.correlationId=correlationId;this.createdAt=Instant.now();}
    public UUID getId(){return id;} public UUID getActorId(){return actorId;} public String getAction(){return action;} public String getEntityType(){return entityType;} public UUID getEntityId(){return entityId;} public String getCorrelationId(){return correlationId;} public Instant getCreatedAt(){return createdAt;}
}
