package io.sentinelqe.workforce.employee;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="departments")
public class Department {
    @Id private UUID id;
    @Column(nullable=false,unique=true) private String name;
    protected Department() { }
    public Department(UUID id,String name) { this.id=id; this.name=name; }
    public UUID getId() { return id; } public String getName() { return name; }
}
