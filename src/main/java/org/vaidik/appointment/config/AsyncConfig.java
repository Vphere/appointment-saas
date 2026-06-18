package org.vaidik.appointment.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;

/**
 * Bounded thread pool for all {@code @Async} work (primarily outbound email).
 *
 * Without this, Spring falls back to {@code SimpleAsyncTaskExecutor}, which
 * spawns a brand-new OS thread per task with no upper bound — under a burst
 * of requests (e.g. many appointment status changes triggering emails) this
 * can exhaust resources and slow down the whole instance. A bounded pool
 * keeps memory/thread usage predictable and improves overall response time.
 */
@Slf4j
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (Throwable ex, Method method, Object... params) ->
                log.error("Unhandled exception in async method '{}': {}", method.getName(), ex.getMessage(), ex);
    }
}