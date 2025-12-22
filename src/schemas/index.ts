import { z } from "zod"

export const CreateProjectSchema = z.object({
    name: z.string().min(1, {
        message: "Nazwa projektu jest wymagana",
    }),
    domain: z.string().min(1, {
        message: "Domena jest wymagana (np. localhost:3001)",
    }),
})

