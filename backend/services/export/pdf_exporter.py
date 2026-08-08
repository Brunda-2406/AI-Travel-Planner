import os
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from .adapter import ExportAdapter

class PdfExporter(ExportAdapter):
    def export(self, trip_data: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                                rightMargin=40, leftMargin=40,
                                topMargin=40, bottomMargin=40)
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CoverTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=32,
            leading=38,
            textColor=colors.HexColor('#1A365D'),
            spaceAfter=20
        )
        
        subtitle_style = ParagraphStyle(
            'CoverSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#4A5568'),
            spaceAfter=10
        )

        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#2B6CB0'),
            spaceBefore=15,
            spaceAfter=10
        )

        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#2D3748')
        )

        bold_body = ParagraphStyle(
            'BoldBody',
            parent=body_style,
            fontName='Helvetica-Bold'
        )

        story = []

        # PAGE 1: COVER
        story.append(Spacer(1, 150))
        story.append(Paragraph(f"Trip to {trip_data.get('destination', 'Your Destination')}", title_style))
        story.append(Paragraph(f"Country: {trip_data.get('country', 'N/A')}", subtitle_style))
        story.append(Paragraph(f"Dates: {trip_data.get('startdate', 'N/A')} to {trip_data.get('enddate', 'N/A')}", subtitle_style))
        story.append(Paragraph(f"Travelers: {trip_data.get('travelercount', 1)} ({trip_data.get('travelertype', 'solo')})", subtitle_style))
        story.append(Spacer(1, 50))
        story.append(Paragraph("AI Travel Assistant Platform", subtitle_style))
        story.append(PageBreak())

        # PAGE 2: TRIP SUMMARY & BUDGET
        story.append(Paragraph("Trip Summary", section_heading))
        story.append(Spacer(1, 10))
        
        budget_info = trip_data.get("budget", {})
        if not isinstance(budget_info, dict):
            budget_info = trip_data.get("budget_info", {})
        if not isinstance(budget_info, dict):
            budget_info = {}

        total_budget_val = budget_info.get("totalbudget")
        if total_budget_val is None:
            if not isinstance(trip_data.get("budget"), dict):
                total_budget_val = trip_data.get("budget", 1000.0)
            else:
                total_budget_val = 1000.0

        budget_text = (
            f"<b>Total Budget:</b> {total_budget_val} {trip_data.get('currency', 'USD')}<br/>"
            f"<b>Suggested Total Budget:</b> {budget_info.get('suggestedtotalbudget', '—')} {trip_data.get('currency', 'USD')}<br/>"
            f"<b>Comfort Level:</b> {budget_info.get('comfortlevel', 'Moderate')}<br/>"
            f"<b>Daily Budget Score:</b> {budget_info.get('score', 5.0)} / 10.0<br/>"
            f"<b>Average Daily Budget:</b> {budget_info.get('dailybudget', 150.0)} {trip_data.get('currency', 'USD')}<br/>"
        )
        story.append(Paragraph(budget_text, body_style))
        story.append(Spacer(1, 20))

        story.append(Paragraph("Budget Allocations:", bold_body))
        alloc_data = [["Category", "Allocation"]]
        for k, v in budget_info.get("allocation", {}).items():
            alloc_data.append([k.replace("json", "").title(), f"{v} {trip_data.get('currency', 'USD')}"])
        
        t_alloc = Table(alloc_data, colWidths=[150, 150])
        t_alloc.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (1,0), colors.HexColor('#E2E8F0')),
            ('TEXTCOLOR', (0,0), (1,0), colors.HexColor('#2D3748')),
            ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E0')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_alloc)
        story.append(Spacer(1, 25))

        warnings = budget_info.get("warnings", [])
        if warnings:
            story.append(Paragraph("Warnings:", bold_body))
            for warning in warnings:
                story.append(Paragraph(f"• {warning}", body_style))
                story.append(Spacer(1, 5))
        
        story.append(PageBreak())

        # PAGES 3-N: DAYS
        for day in trip_data.get("days", []):
            story.append(Paragraph(f"Day {day.get('day')} — {day.get('date', 'N/A')}", section_heading))
            if day.get("theme"):
                story.append(Paragraph(f"Theme: {day.get('theme')}", bold_body))
                story.append(Spacer(1, 10))

            weather = day.get("weather", {})
            if weather:
                w_text = f"Weather: {weather.get('condition', 'N/A')} | Temp: {weather.get('templowc', 0)}°C to {weather.get('temphighc', 0)}°C"
                story.append(Paragraph(w_text, body_style))
                story.append(Spacer(1, 10))

            activities_data = [["Time", "Activity", "Category", "Est. Cost"]]
            for act in day.get("activities", []):
                activities_data.append([
                    act.get("timeslot", "morning").title(),
                    act.get("name", "Activity"),
                    act.get("category", "attraction").title(),
                    f"${act.get('estimatedcost', 0.0)}"
                ])
            
            t_act = Table(activities_data, colWidths=[80, 240, 100, 80])
            t_act.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EBF8FF')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#2B6CB0')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t_act)
            story.append(Spacer(1, 15))

            story.append(Paragraph("Route Travel Summary:", bold_body))
            for act in day.get("activities", []):
                t_next = act.get("traveltonext")
                if t_next and t_next.get("distancekm", 0.0) > 0:
                    story.append(Paragraph(
                        f"• From {act['name']} → Next spot via <b>{t_next['mode']}</b> ({t_next['distancekm']} km, ~{t_next['durationminutes']} mins)",
                        body_style
                    ))
            
            story.append(Spacer(1, 30))

        doc.build(story)
        return output_path
