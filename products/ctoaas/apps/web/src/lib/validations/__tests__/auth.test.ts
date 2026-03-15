import { signupSchema, loginSchema } from "../auth";

describe("signupSchema", () => {
  const validData = {
    name: "Jane Smith",
    email: "jane@company.com",
    companyName: "Acme Inc.",
    password: "Str0ng!Pass",
    confirmPassword: "Str0ng!Pass",
  };

  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({ ...validData, name: "J" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "at least 2 characters"
      );
    }
  });

  it("rejects name longer than 100 characters", () => {
    const result = signupSchema.safeParse({
      ...validData,
      name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      ...validData,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects company name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({
      ...validData,
      companyName: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: "str0ng!pass",
      confirmPassword: "str0ng!pass",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("uppercase");
    }
  });

  it("rejects password without lowercase letter", () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: "STR0NG!PASS",
      confirmPassword: "STR0NG!PASS",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("lowercase");
    }
  });

  it("rejects password without number", () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: "Strong!Pass",
      confirmPassword: "Strong!Pass",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("number");
    }
  });

  it("rejects password without special character", () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: "Str0ngPass1",
      confirmPassword: "Str0ngPass1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("special");
    }
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: "Ab1!xyz",
      confirmPassword: "Ab1!xyz",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      ...validData,
      confirmPassword: "DifferentPassword1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmErr = result.error.issues.find(
        (i) => i.path.includes("confirmPassword")
      );
      expect(confirmErr?.message).toContain("do not match");
    }
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("required");
    }
  });
});
