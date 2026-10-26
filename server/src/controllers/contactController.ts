import { Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export async function getContacts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    res.status(200).json({
      success: true,
      data: { contacts },
    });
  } catch (error) {
    next(error);
  }
}

export async function createContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { name, relationship, phone, isPrimary } = req.body;

    // If marked as primary, unmark existing primary contacts for this user
    if (isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { userId: req.user.id, isPrimary: true },
        data: { isPrimary: false },
      });
    } else {
      // Check if user has no contacts yet; if so, make the first one primary automatically
      const count = await prisma.emergencyContact.count({
        where: { userId: req.user.id },
      });
      if (count === 0) {
        req.body.isPrimary = true;
      }
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        relationship: relationship.trim(),
        phone: phone.trim(),
        isPrimary: req.body.isPrimary ?? false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Emergency contact created successfully.",
      data: { contact },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { id } = req.params;
    const { name, relationship, phone, isPrimary } = req.body;

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existingContact || existingContact.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Emergency contact not found.",
      });
      return;
    }

    if (isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { userId: req.user.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updatedContact = await prisma.emergencyContact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(relationship !== undefined && { relationship: relationship.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(isPrimary !== undefined && { isPrimary }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Emergency contact updated successfully.",
      data: { contact: updatedContact },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { id } = req.params;

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existingContact || existingContact.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Emergency contact not found.",
      });
      return;
    }

    await prisma.emergencyContact.delete({
      where: { id },
    });

    // If deleted contact was primary, make the most recent remaining contact primary
    if (existingContact.isPrimary) {
      const remaining = await prisma.emergencyContact.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (remaining) {
        await prisma.emergencyContact.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Emergency contact deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function setPrimaryContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { id } = req.params;

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existingContact || existingContact.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Emergency contact not found.",
      });
      return;
    }

    // Unset all existing primaries for this user
    await prisma.emergencyContact.updateMany({
      where: { userId: req.user.id, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set target as primary
    const updatedContact = await prisma.emergencyContact.update({
      where: { id },
      data: { isPrimary: true },
    });

    res.status(200).json({
      success: true,
      message: "Primary emergency contact updated.",
      data: { contact: updatedContact },
    });
  } catch (error) {
    next(error);
  }
}
