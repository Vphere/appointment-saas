package org.vaidik.appointment;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.UserRepository;

@SpringBootApplication
public class AppointmentSaasApplication {

    public static void main(String[] args) {
        SpringApplication.run(AppointmentSaasApplication.class, args);
    }

    // Below code is used to add admin in database
//    @Bean
//    public CommandLineRunner createAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
//        return args -> {
//            if (userRepository.findByEmail("admin@gmail.com").isEmpty()) {
//
//                User admin = new User();
//                admin.setEmail("admin@gmail.com");
//                admin.setName("Admin");
//                admin.setPassword(passwordEncoder.encode("1234")); // 🔐 encoded
//                admin.setRole(Role.SUPER_ADMIN);
//
//                userRepository.save(admin);
//
//                System.out.println("✅ Admin user created");
//            }
//        };
//    }
}
