import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.models.models import Application

class PdfService:
    @staticmethod
    def generate_acknowledgement_pdf(application: Application) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0F2942"),
            alignment=1,  # Center
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#D97706"),
            alignment=1,
            spaceAfter=12
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0F2942"),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1F2937")
        )

        story = []

        # Header
        story.append(Paragraph("FOOD SAFETY APPROVAL PORTAL", title_style))
        story.append(Paragraph("SIMULATED FSSAI APPROVAL ACKNOWLEDGEMENT RECEIPT (SIH26130 PROTOTYPE)", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F2942"), spaceAfter=15))

        # Application Summary Table
        submission_time_str = application.submission_date.strftime("%d-%b-%Y %I:%M %p") if application.submission_date else datetime.now().strftime("%d-%b-%Y")
        
        summary_data = [
            [Paragraph("<b>Application Number:</b>", body_style), Paragraph(f"<b>{application.application_number}</b>", body_style)],
            [Paragraph("<b>Application Type:</b>", body_style), Paragraph(str(application.application_type.value), body_style)],
            [Paragraph("<b>Current Status:</b>", body_style), Paragraph(f"<font color='#047857'><b>{application.status.value}</b></font>", body_style)],
            [Paragraph("<b>Submission Date:</b>", body_style), Paragraph(submission_time_str, body_style)],
            [Paragraph("<b>External Ref ID:</b>", body_style), Paragraph(application.external_reference_id or "N/A", body_style)],
            [Paragraph("<b>Source System:</b>", body_style), Paragraph(application.source_system or "PORTAL", body_style)]
        ]
        
        t1 = Table(summary_data, colWidths=[150, 390])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(t1)
        story.append(Spacer(1, 15))

        # Business Details
        story.append(Paragraph("Business & Premises Details", section_heading))
        biz = application.business
        prem = application.premises
        app_user = application.applicant

        biz_data = [
            [Paragraph("<b>Business Name:</b>", body_style), Paragraph(biz.business_name if biz else "N/A", body_style)],
            [Paragraph("<b>Legal Name:</b>", body_style), Paragraph(biz.legal_name or (biz.business_name if biz else "N/A"), body_style)],
            [Paragraph("<b>Organization Type:</b>", body_style), Paragraph(biz.organization_type if biz else "N/A", body_style)],
            [Paragraph("<b>Business Activity:</b>", body_style), Paragraph(", ".join([a.activity_type for a in application.activities]) if application.activities else (biz.kind_of_food_business if biz else "Food Manufacturing"), body_style)],
            [Paragraph("<b>Premises Address:</b>", body_style), Paragraph(f"{prem.address_line_1 if prem else ''}, {prem.district if prem else ''}, {prem.state if prem else ''} - {prem.pincode if prem else ''}", body_style)],
            [Paragraph("<b>Applicant / Contact:</b>", body_style), Paragraph(f"{app_user.applicant_name if app_user else ''} ({app_user.mobile if app_user else ''}, {app_user.email if app_user else ''})", body_style)]
        ]

        t2 = Table(biz_data, colWidths=[150, 390])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFFFFF")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(t2)
        story.append(Spacer(1, 15))

        # Products list
        if application.products:
            story.append(Paragraph("Food Products Declared", section_heading))
            prod_headers = [Paragraph("<b>#</b>", body_style), Paragraph("<b>Product Name</b>", body_style), Paragraph("<b>Category</b>", body_style), Paragraph("<b>Capacity</b>", body_style)]
            prod_rows = [prod_headers]
            for i, p in enumerate(application.products, 1):
                prod_rows.append([
                    Paragraph(str(i), body_style),
                    Paragraph(p.product_name, body_style),
                    Paragraph(p.product_category, body_style),
                    Paragraph(f"{p.expected_capacity} {p.unit_of_measure}", body_style)
                ])
            t3 = Table(prod_rows, colWidths=[30, 200, 160, 150])
            t3.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(t3)
            story.append(Spacer(1, 15))

        # Disclaimer
        disclaimer_text = (
            "<b>Important Prototype Disclaimer:</b> This document is automatically generated by the "
            "SIH26130 Mock FSSAI Approval Portal for simulation and evaluation purposes only. "
            "It does not represent an official government license or approval by FSSAI/FoSCoS."
        )
        story.append(Paragraph(disclaimer_text, ParagraphStyle("Disc", parent=body_style, fontSize=8, textColor=colors.HexColor("#64748B"))))

        doc.build(story)
        return buffer.getvalue()

pdf_service = PdfService()
