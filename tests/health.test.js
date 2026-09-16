const request = require("supertest");
const app = require("../src/app");

describe("Health API", () => {
    test("GET /api/health should return healthy status", async () => {
        const response = await request(app)
            .get("/api/health");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("healthy");
        expect(response.body.service).toBe(
            "devops-portfolio-platform"
        );
    });

    test("GET / should return application information", async () => {
        const response = await request(app)
            .get("/");

        expect(response.statusCode).toBe(200);
        expect(response.body.service).toBe(
            "DevOps Portfolio Platform"
        );
    });
});