package com.naomale.auth;

import com.naomale.Entities;

public record AuthContext(Entities.User user, Entities.Session session) {
}
