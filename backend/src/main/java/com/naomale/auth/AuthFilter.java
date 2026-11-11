package com.naomale.auth;

import com.naomale.service.AuthService;
import com.naomale.web.Cookies;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class AuthFilter extends OncePerRequestFilter {
    private final AuthService authService;

    public AuthFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.startsWith("/api") || path.startsWith("/media"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = Cookies.read(request);
        if (token != null && !token.isBlank()) {
            AuthContext context = authService.resolve(token);
            if (context != null) request.setAttribute(AuthSupport.ATTRIBUTE, context);
        }
        chain.doFilter(request, response);
    }
}
