import { PrismaClient, AppointmentStatus, LabOrderStatus, LabResultStatus, NotificationType, ReferralStatus, RefillRequestStatus, AuditAction, ShareLinkStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get existing data
  const patient = await prisma.patient.findFirst();
  const drPatel = await prisma.doctor.findFirst({ where: { user: { email: "dr.patel@medportal.com" } }, include: { user: true } });
  const drLee = await prisma.doctor.findFirst({ where: { user: { email: "dr.lee@medportal.com" } }, include: { user: true } });
  const nurse = await prisma.nurse.findFirst();
  const labTech = await prisma.labTechnician.findFirst();
  const patientUser = await prisma.user.findFirst({ where: { email: "avery.johnson@medportal.com" } });
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@medportal.com" }, include: { adminProfile: true } });

  if (!patient || !drPatel || !drLee || !nurse || !labTech || !patientUser || !adminUser) {
    throw new Error("Missing required existing data. Run the main seed first.");
  }

  // --- 2 more appointments ---
  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: drPatel.id,
      department: "Endocrinology",
      reason: "Quarterly A1C review and medication adjustment",
      status: AppointmentStatus.SCHEDULED,
      appointmentDate: new Date("2026-04-15T10:30:00Z"),
      location: "Wellness Tower - Level 4, Room 412",
      notes: "Bring glucose log from past 3 months",
    }
  });

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: drLee.id,
      department: "Neurology",
      reason: "Post-treatment migraine assessment",
      status: AppointmentStatus.COMPLETED,
      appointmentDate: new Date("2026-02-10T14:00:00Z"),
      location: "Neuro Center - Level 3, Room 308",
      notes: "Migraine frequency reduced from 4/month to 1/month. Continue current therapy.",
    }
  });

  // --- 2 more medical records ---
  await prisma.medicalRecord.create({
    data: {
      patientId: patient.id,
      doctorId: drPatel.id,
      title: "Diabetes Management Review",
      department: "Endocrinology",
      summary: "A1C improved from 7.2% to 6.5%. Patient adhering well to diet modifications. Metformin dosage maintained. Schedule follow-up in 3 months.",
      visitDate: new Date("2026-01-20T09:00:00Z"),
    }
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: patient.id,
      doctorId: drLee.id,
      title: "Migraine Frequency Assessment",
      department: "Neurology",
      summary: "Patient reports significant improvement. Migraine episodes down to once per month. Sumatriptan effective for acute episodes. No medication side effects reported.",
      visitDate: new Date("2026-02-10T14:30:00Z"),
    }
  });

  // --- 2 more prescriptions ---
  const rxMetformin = await prisma.prescription.create({
    data: {
      patientId: patient.id,
      doctorId: drPatel.id,
      medication: "Metformin XR",
      dosage: "750 mg",
      frequency: "Once daily with dinner",
      instructions: "Extended release - do not crush or split tablet. Monitor blood glucose regularly.",
      startDate: new Date("2026-01-20T00:00:00Z"),
      refills: 5,
      refillsRemaining: 4,
      expiresOn: new Date("2027-01-20T00:00:00Z"),
    }
  });

  await prisma.prescription.create({
    data: {
      patientId: patient.id,
      doctorId: drLee.id,
      medication: "Sumatriptan Nasal Spray",
      dosage: "20 mg",
      frequency: "As needed at migraine onset",
      instructions: "Do not exceed 40 mg in 24 hours. If no relief after 2 hours, may take second dose.",
      startDate: new Date("2026-02-10T00:00:00Z"),
      refills: 3,
      refillsRemaining: 3,
      expiresOn: new Date("2027-02-10T00:00:00Z"),
    }
  });

  // --- 1 refill request (approved) ---
  await prisma.prescriptionRefillRequest.create({
    data: {
      prescriptionId: rxMetformin.id,
      patientId: patient.id,
      doctorId: drPatel.id,
      requestedById: patientUser.id,
      message: "Running low on Metformin XR, need refill before my next appointment",
      status: RefillRequestStatus.APPROVED,
      decisionById: drPatel.userId,
      decidedAt: new Date("2026-03-10T11:00:00Z"),
    }
  });

  // --- 1 lab order + 1 lab result with attachment ---
  const labOrder = await prisma.labOrder.create({
    data: {
      patientId: patient.id,
      doctorId: drPatel.id,
      technicianId: labTech.id,
      testName: "Comprehensive Metabolic Panel",
      priority: "Routine",
      status: LabOrderStatus.COMPLETED,
      notes: "Fasting required. Check kidney and liver function alongside glucose.",
    }
  });

  const labResult = await prisma.labResult.create({
    data: {
      patientId: patient.id,
      doctorId: drPatel.id,
      labOrderId: labOrder.id,
      testName: "Comprehensive Metabolic Panel",
      resultDate: new Date("2026-03-05T00:00:00Z"),
      resultSummary: "Glucose: 105 mg/dL (slightly elevated). BUN/Creatinine: normal. Liver enzymes: within range. Electrolytes: balanced.",
      status: LabResultStatus.NORMAL,
      value: "Glucose 105, BUN 15, Creatinine 0.9, AST 22, ALT 18",
      referenceRange: "Glucose: 70-100, BUN: 7-20, Creatinine: 0.6-1.2",
    }
  });

  await prisma.labAttachment.create({
    data: {
      labResultId: labResult.id,
      technicianId: labTech.id,
      fileName: "cmp-march-2026.pdf",
      fileType: "application/pdf",
      fileUrl: "/uploads/labs/cmp-march-2026.pdf",
    }
  });

  // --- 1 vital record ---
  await prisma.vital.create({
    data: {
      patientId: patient.id,
      nurseId: nurse.id,
      heartRate: 68,
      bloodPressure: "122/78",
      temperature: 98.4,
      respiratoryRate: 15,
      notes: "Patient resting comfortably. No acute distress. Weight stable at 165 lbs.",
    }
  });

  // --- 1 referral (Dr. Patel → Dr. Lee) ---
  await prisma.referral.create({
    data: {
      patientId: patient.id,
      fromDoctorId: drPatel.id,
      toDoctorId: drLee.id,
      status: ReferralStatus.ACCEPTED,
      reason: "Re-evaluation of migraine protocol due to medication interaction with Metformin",
      notes: "Patient experiencing increased migraine frequency since Metformin dosage change. Please assess.",
      expiresAt: new Date("2026-06-15T00:00:00Z"),
    }
  });

  // --- 1 share link ---
  await prisma.medicalShareLink.create({
    data: {
      patientId: patient.id,
      token: `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: ShareLinkStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });

  // --- 4 notifications ---
  await prisma.notification.createMany({
    data: [
      {
        userId: patientUser.id,
        type: NotificationType.APPOINTMENT,
        title: "Upcoming appointment with Dr. Patel",
        description: "Your A1C review appointment is scheduled for April 15 at 10:30 AM",
        link: "/dashboard/appointments",
      },
      {
        userId: patientUser.id,
        type: NotificationType.LAB_RESULT,
        title: "Lab results ready",
        description: "Your Comprehensive Metabolic Panel results are now available",
        link: "/dashboard/records",
      },
      {
        userId: drPatel.userId,
        type: NotificationType.PRESCRIPTION,
        title: "Refill request approved",
        description: "Metformin XR refill for Avery Johnson has been processed",
        link: "/dashboard/prescriptions",
      },
      {
        userId: drLee.userId,
        type: NotificationType.REFERRAL,
        title: "New referral received",
        description: "Dr. Patel has referred Avery Johnson for migraine re-evaluation",
        link: "/dashboard/records",
      },
    ]
  });

  // --- 1 message ---
  await prisma.message.create({
    data: {
      senderId: drPatel.userId,
      recipientId: patientUser.id,
      patientId: patient.id,
      doctorId: drPatel.id,
      content: "Hi Avery, your latest CMP results look good overall. Glucose is slightly elevated at 105 — let's discuss dietary adjustments at your April appointment. Keep up the great work with your exercise routine!",
    }
  });

  // --- 2 audit logs ---
  await prisma.auditLog.createMany({
    data: [
      {
        userId: drPatel.userId,
        patientId: patient.id,
        action: AuditAction.VIEW_RECORD,
        resourceType: "lab_result",
        resourceId: labResult.id,
        details: { note: "Reviewed CMP results for Avery Johnson" },
      },
      {
        userId: adminUser.id,
        patientId: patient.id,
        action: AuditAction.UPDATE_RECORD,
        resourceType: "patient",
        resourceId: patient.id,
        details: { note: "Updated insurance information for Avery Johnson" },
      },
    ]
  });

  // --- 1 bulk import job ---
  await prisma.bulkImportJob.create({
    data: {
      adminId: adminUser.adminProfile!.id,
      fileName: "patients-q1-2026.csv",
      status: "COMPLETED",
      totalRows: 250,
      processedRows: 248,
      errorReport: { rowsWithErrors: [47, 189], errors: ["Invalid date format", "Duplicate email"] },
    }
  });

  console.log("✅ Extra data added successfully!");
  console.log("   - 2 appointments (1 scheduled, 1 completed)");
  console.log("   - 2 medical records");
  console.log("   - 2 prescriptions (Metformin XR, Sumatriptan Nasal Spray)");
  console.log("   - 1 refill request (approved)");
  console.log("   - 1 lab order + 1 lab result with attachment");
  console.log("   - 1 vital record");
  console.log("   - 1 referral (Dr. Patel → Dr. Lee)");
  console.log("   - 1 share link");
  console.log("   - 4 notifications");
  console.log("   - 1 message");
  console.log("   - 2 audit logs");
  console.log("   - 1 bulk import job");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
