package com.naomale.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** DeepSeek 服务端代理（deepseek-flash / deepseek-v4-pro）。 */
@Component
public class DeepSeekClient {
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private String baseUrl() {
        String base = System.getenv("DEEPSEEK_BASE_URL");
        if (base == null || base.isBlank()) base = "https://api.deepseek.com";
        return base.replaceAll("/+$", "");
    }

    private String apiKey(Entities.Settings settings) {
        String key = settings.getDeepseekApiKey();
        if (key == null || key.isBlank()) {
            throw new AppException(409, "尚未配置 DeepSeek API Key，请先在「系统设置」中填写");
        }
        return key.trim();
    }

    private String model(Entities.Settings settings) {
        String model = settings.getAiModel();
        return model == null || model.isBlank() ? "deepseek-flash" : model.trim();
    }

    public String chat(Entities.Settings settings, List<Map<String, Object>> messages,
                       boolean jsonMode, double temperature, int maxTokens) {
        String key = apiKey(settings);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model(settings));
        body.put("messages", messages);
        body.put("stream", false);
        body.put("thinking", Map.of("type", "disabled"));
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        if (jsonMode) body.put("response_format", Map.of("type", "json_object"));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + key)
                .POST(HttpRequest.BodyPublishers.ofString(Jsons.write(body)))
                .build();

        HttpResponse<String> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception error) {
            throw new AppException(502, "无法连接 DeepSeek：" + error.getMessage());
        }

        if (response.statusCode() != 200) {
            String detail = errorDetail(response.body());
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw AppException.unauthorized("DeepSeek API Key 无效或权限不足，请在系统设置中检查");
            }
            if (response.statusCode() == 429) {
                throw new AppException(429, "DeepSeek 请求过于频繁或额度不足，请稍后再试");
            }
            if (response.statusCode() == 400 && detail.toLowerCase().contains("model")) {
                throw AppException.badRequest("模型 " + model(settings) + " 不可用，请改为 deepseek-flash");
            }
            throw new AppException(502, "DeepSeek 接口返回 " + response.statusCode() + "：" + detail);
        }

        try {
            Map<String, Object> data = Jsons.MAPPER.readValue(response.body(), new TypeReference<>() {
            });
            List<Object> choices = Jsons.list(data.get("choices"));
            if (choices.isEmpty()) throw new AppException(502, "DeepSeek 返回内容为空");
            Map<String, Object> message = Jsons.map(Jsons.map(choices.get(0)).get("message"));
            String content = Jsons.str(message.get("content"), "");
            if (content.isBlank()) throw new AppException(502, "DeepSeek 返回内容为空");
            return content;
        } catch (AppException error) {
            throw error;
        } catch (Exception error) {
            throw new AppException(502, "DeepSeek 返回格式异常：" + error.getMessage());
        }
    }

    public Map<String, Object> test(Entities.Settings settings) {
        String key = apiKey(settings);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/models"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + key)
                .GET()
                .build();
        HttpResponse<String> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception error) {
            throw new AppException(502, "无法连接 DeepSeek：" + error.getMessage());
        }
        if (response.statusCode() != 200) {
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw AppException.unauthorized("API Key 无效，请检查后重试");
            }
            throw new AppException(502, "DeepSeek 返回 " + response.statusCode() + "：" + errorDetail(response.body()));
        }

        List<String> models = new ArrayList<>();
        try {
            Map<String, Object> data = Jsons.MAPPER.readValue(response.body(), new TypeReference<>() {
            });
            for (Object item : Jsons.list(data.get("data"))) {
                String id = Jsons.str(Jsons.map(item).get("id"), "");
                if (!id.isBlank()) models.add(id);
            }
        } catch (Exception error) {
            throw new AppException(502, "DeepSeek 模型列表解析失败");
        }

        String model = model(settings);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("model", model);
        result.put("models", models);
        result.put("modelAvailable", models.isEmpty() || models.contains(model));
        return result;
    }

    private String errorDetail(String body) {
        try {
            Map<String, Object> data = Jsons.MAPPER.readValue(body, new TypeReference<>() {
            });
            Map<String, Object> error = Jsons.map(data.get("error"));
            String message = Jsons.str(error.get("message"), "");
            if (!message.isBlank()) return message;
        } catch (Exception ignored) {
        }
        return body == null ? "" : body.substring(0, Math.min(300, body.length()));
    }
}
