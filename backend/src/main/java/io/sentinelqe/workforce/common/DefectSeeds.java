package io.sentinelqe.workforce.common;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.util.Arrays;
@Component
public class DefectSeeds {
    private final boolean doubleFinalize,slowPayroll,wrongTax,bypassManager;
    public DefectSeeds(Environment environment,@Value("${app.defects.enabled:false}") boolean enabled,@Value("${app.defects.double-finalize:false}") boolean doubleFinalize,@Value("${app.defects.slow-payroll:false}") boolean slowPayroll,@Value("${app.defects.wrong-tax:false}") boolean wrongTax,@Value("${app.defects.bypass-manager-check:false}") boolean bypassManager) {
        boolean requested=doubleFinalize||slowPayroll||wrongTax||bypassManager;
        boolean demo=Arrays.asList(environment.getActiveProfiles()).contains("demo");
        if((enabled||requested) && !demo) throw new IllegalStateException("Defect seeds require the explicit demo profile");
        if(requested&&!enabled) throw new IllegalStateException("Defect seeds require DEFECT_SEEDS_ENABLED=true");
        this.doubleFinalize=enabled&&doubleFinalize;this.slowPayroll=enabled&&slowPayroll;this.wrongTax=enabled&&wrongTax;this.bypassManager=enabled&&bypassManager;
        if(requested) LoggerFactory.getLogger(DefectSeeds.class).warn("DEMO DEFECT SEEDS ACTIVE doubleFinalize={} slowPayroll={} wrongTax={} bypassManager={}",doubleFinalize,slowPayroll,wrongTax,bypassManager);
    }
    public boolean doubleFinalize(){return doubleFinalize;} public boolean slowPayroll(){return slowPayroll;} public boolean wrongTax(){return wrongTax;} public boolean bypassManager(){return bypassManager;}
}
