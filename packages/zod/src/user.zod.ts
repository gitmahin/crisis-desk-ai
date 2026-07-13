import z4 from "zod/v4";

class UserZSchema {
    createUser = z4.object({
        name: z4.string({ error: "Invalid Name!" }).max(255, { error: "" }).optional(),
        email: z4.email({ error: "Invalid email!" }).nonempty({ error: "Email is required" }),
        password: z4.string({ error: "Invalid password" }).min(8, { error: "Password should be at least 8 characters" }).max(20, { error: "Password max length exceded" }),
    })
}

export const userZSchema = new UserZSchema()

export type CreateUserPayloadType = z4.infer<typeof userZSchema.createUser>