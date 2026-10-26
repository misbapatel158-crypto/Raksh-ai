import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().optional(),
  countryCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
});

export const createContactSchema = z.object({
  name: z.string().min(2, "Contact name is required").max(100),
  relationship: z.string().min(1, "Relationship is required").max(50),
  phone: z.string().min(5, "Valid phone number is required").max(25),
  isPrimary: z.boolean().optional(),
});

export const updateContactSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  relationship: z.string().min(1).max(50).optional(),
  phone: z.string().min(5).max(25).optional(),
  isPrimary: z.boolean().optional(),
});

export const createIncidentSchema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  description: z.string().min(1, "Description is required"),
  peopleAffected: z.number().int().min(1).default(1),
  vehiclesInvolved: z.number().int().min(0).default(0),
  anyoneTrapped: z.boolean().default(false),
  smokeOrFire: z.boolean().default(false),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationAccuracy: z.number().optional(),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(["REPORT_CREATED", "HELP_IDENTIFIED", "ACTION_TAKEN", "RESOLVED"]),
});

export const analyzeEmergencySchema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  description: z.string().default(""),
  peopleAffected: z.number().int().min(1).default(1),
  vehiclesInvolved: z.number().int().min(0).default(0),
  anyoneTrapped: z.boolean().default(false),
  smokeOrFire: z.boolean().default(false),
});

export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.issues) {
        const issues = (error as any).issues || (error as any).errors || [];
        const errorMessages = issues.map((e: any) => `${e.path?.join(".") || "field"}: ${e.message}`).join(", ");
        res.status(400).json({
          success: false,
          message: errorMessages || "Invalid input data",
          errors: issues,
        });
        return;
      }
      next(error);
    }
  };
}
