import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.colors import HexColor, white, black, lightgrey
from reportlab.pdfgen import canvas

# Define colors matching premium Apollo branding (Teal and Navy Blue)
PRIMARY_COLOR = HexColor('#004E64')   # Deep Teal/Navy
SECONDARY_COLOR = HexColor('#25A18E') # Emerald/Teal
TEXT_COLOR = HexColor('#2D3748')      # Charcoal
ACCENT_COLOR = HexColor('#D9534F')    # Muted Red for emergency
LINE_COLOR = HexColor('#E2E8F0')

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(HexColor('#004E64'))
        # Header
        self.drawString(54, 750, "Apollo Hospitals Group")
        self.setFont("Helvetica", 8)
        self.setFillColor(HexColor('#718096'))
        self.drawRightString(558, 750, "Official Hospital Directory & Guidelines")
        self.setStrokeColor(LINE_COLOR)
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Footer
        self.line(54, 54, 558, 54)
        self.drawString(54, 40, "Apollo Helpline: +91 40 4344 0109 | Emergency Hotline: +91 99999 88888")
        self.drawRightString(558, 40, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf(filename, title, stories):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=80,
        bottomMargin=80
    )
    doc.build(stories, canvasmaker=NumberedCanvas)


def get_styles():
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='HospitalTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY_COLOR,
        spaceAfter=15,
        alignment=1 # Centered
    ))
    
    styles.add(ParagraphStyle(
        name='HospitalSubTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=SECONDARY_COLOR,
        spaceBefore=12,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='HospitalSection',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=PRIMARY_COLOR,
        spaceBefore=10,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='HospitalBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_COLOR,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='HospitalBodyBold',
        parent=styles['HospitalBody'],
        fontName='Helvetica-Bold'
    ))

    styles.add(ParagraphStyle(
        name='HospitalFAQQuestion',
        parent=styles['HospitalBody'],
        fontName='Helvetica-Bold',
        textColor=PRIMARY_COLOR,
        spaceBefore=8,
        spaceAfter=2
    ))

    styles.add(ParagraphStyle(
        name='HospitalFAQAnswer',
        parent=styles['HospitalBody'],
        leftIndent=15,
        spaceAfter=8
    ))

    styles.add(ParagraphStyle(
        name='EmergencyHeader',
        parent=styles['HospitalSubTitle'],
        textColor=ACCENT_COLOR
    ))
    
    return styles

def generate_patient_guide(styles):
    story = []
    story.append(Paragraph("Apollo Patient Guide", styles['HospitalTitle']))
    story.append(Paragraph("Welcome to Apollo Hospitals. Our mission is to bring healthcare of international standards within the reach of every individual. We are committed to the achievement and maintenance of excellence in education, research, and healthcare.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("1. Hospital Network Introduction", styles['HospitalSubTitle']))
    story.append(Paragraph("Apollo Hospitals Group is a pioneer of modern healthcare in India. It is a multi-speciality tertiary care hospital chain with thousands of beds across multiple cities, over 15 major clinical departments, and world-renowned medical specialists. All major Apollo facilities are accredited by JCI (Joint Commission International) and NABH, ensuring safety, hygiene, and clinical excellence.", styles['HospitalBody']))
    
    story.append(Paragraph("2. Registration Process", styles['HospitalSubTitle']))
    story.append(Paragraph("<b>Outpatient (OP) Registration:</b> All new patients must register at the reception counter. A unique Patient ID (PID) will be generated. Please carry a valid government photo ID card (Aadhaar Card, Passport, or Voter ID). Registration is a one-time process, and the standard registration fee is INR 200.", styles['HospitalBody']))
    story.append(Paragraph("<b>Inpatient (IP) Registration:</b> Patients advised for admission must proceed to the Admission Desk. The staff will help you choose a room category (General Ward, Semi-Private, Private, Deluxe, or Suite) and complete the registration and insurance authorization procedures.", styles['HospitalBody']))
    
    story.append(Paragraph("3. Admission Procedure", styles['HospitalSubTitle']))
    story.append(Paragraph("During admission, please bring: 1. Doctor's admission prescription. 2. Insurance card and pre-authorization approvals (if applicable). 3. Past medical records, reports, and current medications. 4. Government-issued photo ID.", styles['HospitalBody']))
    story.append(Paragraph("For cash-paying patients, an advance payment based on the expected stay and room category is required at the time of admission.", styles['HospitalBody']))
    
    story.append(Paragraph("4. Discharge Process", styles['HospitalSubTitle']))
    story.append(Paragraph("Discharges are planned by the treating doctor during morning rounds (usually 9:00 AM to 11:00 AM). The discharge process takes approximately 2 to 3 hours for cash patients and 4 to 5 hours for cashless insurance patients due to TPA approval cycles. Once the billing is cleared, you will receive your discharge summary and take-home medications with instructions.", styles['HospitalBody']))
    
    story.append(Paragraph("5. Billing & Payment Methods", styles['HospitalSubTitle']))
    story.append(Paragraph("Billing counters are open 24/7. We accept Cash, Debit/Credit Cards, UPI, Net Banking, and major mobile wallets. Interim bills can be obtained from the ward coordinator to monitor expenses.", styles['HospitalBody']))
    
    story.append(Paragraph("6. Cashless Insurance Claim Process", styles['HospitalSubTitle']))
    story.append(Paragraph("For cashless hospitalization, please submit your insurance card and pre-authorization form to the TPA desk within 24 hours of planned admission, and within 12 hours of emergency admission. If cashless approval is delayed, patients can pay the bill in full at discharge and claim reimbursement later.", styles['HospitalBody']))

    story.append(PageBreak())
    
    story.append(Paragraph("7. Emergency & Ambulance Services", styles['HospitalSubTitle']))
    story.append(Paragraph("Our Emergency and Trauma Care unit is open 24 hours a day, 365 days a year. We operate an advanced ambulance service equipped with ventilators, defibrillators, and basic life support systems. Call our Emergency Hotline at +91 99999 88888 for immediate assistance.", styles['HospitalBody']))
    
    story.append(Paragraph("8. OP/IP Information", styles['HospitalSubTitle']))
    story.append(Paragraph("<b>Outpatient Services:</b> Consultations are available from 9:00 AM to 8:00 PM on weekdays, and 9:00 AM to 1:00 PM on Sundays. Prior booking is highly recommended.", styles['HospitalBody']))
    story.append(Paragraph("<b>Inpatient Services:</b> We offer general wards (6-bed sharing), semi-private rooms (2-bed sharing), private AC rooms, deluxe rooms, and executive suites. Nursing care ratio ranges from 1:1 in ICUs to 1:6 in general wards.", styles['HospitalBody']))
    
    story.append(Paragraph("9. Hospital Timings", styles['HospitalSubTitle']))
    story.append(Paragraph("<b>Main Hospital Gate:</b> Open 24/7<br/>"
                           "<b>Outpatient Departments:</b> 9:00 AM – 8:00 PM (Monday to Saturday)<br/>"
                           "<b>Pharmacy (Ground Floor):</b> Open 24/7<br/>"
                           "<b>Laboratory & Diagnostics:</b> Open 24/7 (Emergency), 7:00 AM – 9:00 PM (Routine)<br/>"
                           "<b>Visiting Hours (IPD Wards):</b> 4:00 PM – 7:00 PM daily<br/>"
                           "<b>ICU Visiting Hours:</b> 11:00 AM – 12:00 PM & 5:00 PM – 6:00 PM (1 visitor only)", styles['HospitalBody']))
    
    story.append(Paragraph("10. Contact Information", styles['HospitalSubTitle']))
    story.append(Paragraph("<b>Emergency Hotline:</b> +91 99999 88888 (24x7)<br/>"
                           "<b>Main Reception / Help Desk:</b> +91 40 4344 0109<br/>"
                           "<b>Appointment Booking Helpline:</b> +91 40 4344 0100<br/>"
                           "<b>TPA & Insurance Desk:</b> +91 40 4344 0155<br/>"
                           "<b>Email Support:</b> info@apollohospitals.com / appointments@apollohospitals.com", styles['HospitalBody']))
    
    story.append(Paragraph("11. Frequently Asked Questions (FAQ Summary)", styles['HospitalSubTitle']))
    faqs = [
        ("What documents should I carry for registration?", "You should carry a government-issued photo ID card (Aadhaar, Passport, driving license, etc.) and any past medical records."),
        ("Where can I collect my discharge summary?", "The discharge summary will be handed over to you in the ward by the staff nurse once the billing clearance is completed."),
        ("Can I get an extension on paying my bills?", "Payment of bills must be cleared before discharge. For long stays, patients must pay interim payments as requested by the billing desk."),
        ("Is there a pharmacy inside the hospital?", "Yes, Apollo Pharmacy is located on the ground floor next to the emergency room and is open 24/7."),
        ("Is there parking available for patients?", "Yes, we provide 24/7 multi-level valet parking for patients and visitors. Parking charges are INR 50 for the first 2 hours.")
    ]
    for q, a in faqs:
        story.append(Paragraph(f"<b>Q: {q}</b>", styles['HospitalFAQQuestion']))
        story.append(Paragraph(f"A: {a}", styles['HospitalFAQAnswer']))
        
    build_pdf("documents/Patient_Guide.pdf", "Patient Guide", story)

def generate_doctors_directory(styles):
    story = []
    story.append(Paragraph("Doctors Directory", styles['HospitalTitle']))
    story.append(Paragraph("Apollo Hospitals Group has a team of highly qualified medical professionals across various specialties and locations. Below is the official directory of our consulting doctors.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    # Doctors list containing City and Branch to align with appointmentController
    # (Name, Department, City, Branch, Qualification, Exp, Days, Timings, Room, Languages)
    doctors = [
        # Cardiology
        ("Dr. Vikram Reddy", "Cardiology", "Hyderabad", "Jubilee Hills", "DM (Cardiology)", "18 Years", "Mon, Wed, Fri", "10:00 AM - 2:00 PM", "Room 201", "English, Telugu, Hindi"),
        ("Dr. Anjali Sharma", "Cardiology", "Hyderabad", "Secunderabad", "MD, DM", "12 Years", "Tue, Thu, Sat", "09:00 AM - 1:00 PM", "Room 202", "English, Hindi, Telugu"),
        ("Dr. Priya Nair", "Cardiology", "Mumbai", "Navi Mumbai", "DNB (Cardiology)", "12 Years", "Tue, Thu, Sat", "11:00 AM - 3:00 PM", "Room 203", "English, Malayalam, Hindi"),
        ("Dr. Karthik Raja", "Cardiology", "Chennai", "Greams Road", "DM (Cardiology)", "11 Years", "Mon, Wed, Fri", "3:00 PM - 6:00 PM", "Room 204", "English, Tamil"),
        # Neurology
        ("Dr. Ramesh Krishnan", "Neurology", "Chennai", "Greams Road", "DM (Neurology)", "20 Years", "Mon-Fri", "10:00 AM - 1:00 PM", "Room 301", "English, Tamil, Hindi"),
        ("Dr. Priya Nair", "Neurology", "Chennai", "Greams Road", "MD, DNB", "14 Years", "Tue, Thu, Sat", "02:00 PM - 5:00 PM", "Room 302", "English, Tamil, Malayalam"),
        ("Dr. Sanjay Sen", "Neurology", "Kolkata", "Gleneagles", "DM (Neurology)", "20 Years", "Mon-Wed", "9:00 AM - 12:00 PM", "Room 303", "English, Bengali"),
        ("Dr. Meera Deshmukh", "Neurology", "Mumbai", "Navi Mumbai", "DNB (Neurology)", "14 Years", "Thu-Sat", "2:00 PM - 5:00 PM", "Room 304", "English, Marathi, Hindi"),
        # Orthopedics
        ("Dr. Sandeep Hegde", "Orthopedics", "Bangalore", "Bannerghatta Road", "MS (Orthopedics)", "16 Years", "Mon, Wed, Fri", "11:00 AM - 2:30 PM", "Room 105", "English, Kannada, Hindi"),
        ("Dr. S. K. Prasad", "Orthopedics", "Vizag", "Arilova", "MS (Orthopedics)", "12 Years", "Mon-Sat", "04:00 PM - 6:00 PM", "Room 106", "English, Telugu"),
        ("Dr. Amit Patel", "Orthopedics", "Hyderabad", "Jubilee Hills", "MS (Orthopedics)", "15 Years", "Mon, Wed, Fri", "10:00 AM - 1:00 PM", "Room 107", "English, Telugu, Hindi"),
        # Pediatrics
        ("Dr. Sunita Rao", "Pediatrics", "Bangalore", "Jayanagar", "MD (Pediatrics)", "13 Years", "Mon-Sat", "10:00 AM - 1:00 PM", "Room 110", "English, Kannada, Hindi"),
        ("Dr. Shalini Gupta", "Pediatrics", "Delhi", "Noida", "MD, DCH", "9 Years", "Mon-Fri", "3:00 PM - 7:00 PM", "Room 111", "English, Hindi"),
        # Oncology
        ("Dr. Amit Shah", "Oncology", "Chennai", "Cancer Centre, Teynampet", "DM (Oncology)", "15 Years", "Mon, Wed, Fri", "01:00 PM - 3:00 PM", "Room 410", "English, Hindi, Tamil"),
        ("Dr. Sameer Bhat", "Oncology", "Delhi", "Sarita Vihar", "DM (Medical Oncology)", "15 Years", "Mon, Wed, Fri", "9:00 AM - 1:00 PM", "Room 411", "English, Hindi, Kashmiri"),
        # Gastroenterology
        ("Dr. Rakesh Prasad", "Gastroenterology", "Hyderabad", "Jubilee Hills", "DM (Gastroenterology)", "18 Years", "Mon, Wed, Fri", "10:00 AM - 1:00 PM", "Room 320", "English, Telugu, Hindi"),
        # General Medicine
        ("Dr. Rajesh Kumar", "General Medicine", "Delhi", "Sarita Vihar", "MD (Internal Medicine)", "15 Years", "Mon-Sat", "9:00 AM - 1:00 PM", "Room 101", "English, Hindi"),
        ("Dr. Anita Sharma", "General Medicine", "Bangalore", "Bannerghatta Road", "MBBS, MD", "10 Years", "Mon-Fri", "2:00 PM - 6:00 PM", "Room 102", "English, Kannada, Hindi")
    ]

    # Convert to reportlab Table
    table_data = [["Doctor Name", "Department", "City / Branch", "Qualification", "Days & Timings", "Room", "Languages"]]
    for doc in doctors:
        dname, dept, city, branch, qual, exp, days, timings, room, lang = doc
        location_str = f"{city}\n({branch})"
        schedule_str = f"{days}\n{timings}"
        table_data.append([dname, dept, location_str, qual, schedule_str, room, lang])
        
    t = Table(table_data, colWidths=[90, 80, 100, 70, 95, 35, 60])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 7.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e2e8f0')),
        ('BACKGROUND', (0,1), (-1,-1), HexColor('#fafafa')),
    ]))
    
    story.append(t)
    build_pdf("documents/Doctors_Directory.pdf", "Doctors Directory", story)

def generate_departments(styles):
    story = []
    story.append(Paragraph("Departments Profile", styles['HospitalTitle']))
    story.append(Paragraph("Apollo Hospitals features world-class infrastructure across multiple clinical departments, each run by leading medical specialists.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    depts = [
        {
            "name": "General Medicine",
            "desc": "Primary care, health checks, diabetes, thyroid management, hypertension, and infectious diseases.",
            "services": "Master Health Check, Outpatient clinics, 24/7 acute infection support, and preventive health screenings."
        },
        {
            "name": "Cardiology",
            "desc": "Leading center for cardiovascular medicine, offering bypass surgeries, angioplasties, and diagnostic echo/TMT scans.",
            "services": "24/7 Cardiac Emergency Room, Cath Lab, Heart transplant unit, and pacemaker implantations."
        },
        {
            "name": "Neurology",
            "desc": "State-of-the-art department treating strokes, Parkinson's disease, Alzheimer's, epilepsy, migraines, and nerve disorders.",
            "services": "Stroke Helpline, Sleep lab, EEG/EMG diagnostic labs, and neuro-ICU care."
        },
        {
            "name": "Orthopedics",
            "desc": "Specialized orthopedic clinic for fracture repair, arthroscopy, joint reconstruction, and sports medicine.",
            "services": "Robotic joint replacements, spinal surgeries, physiotherapy clinic, and pediatric orthopedics."
        },
        {
            "name": "Pediatrics",
            "desc": "Dedicated care for infants, children, and adolescents, including standard vaccinations and development checks.",
            "services": "Neonatal ICU (NICU), Pediatric ICU, routine vaccination camps, and nutrition counseling."
        },
        {
            "name": "Oncology",
            "desc": "Comprehensive cancer care center specializing in medical oncology, radiation therapy, and surgical oncology.",
            "services": "Chemotherapy daycare, LINAC radiotherapy, immunotherapy, and cancer counseling support."
        }
    ]
    
    for dept in depts:
        story.append(Paragraph(dept["name"], styles['HospitalSubTitle']))
        story.append(Paragraph(f"<b>Overview:</b> {dept['desc']}", styles['HospitalBody']))
        story.append(Paragraph(f"<b>Services Offered:</b> {dept['services']}", styles['HospitalBody']))
        story.append(Spacer(1, 5))
        
    build_pdf("documents/Departments.pdf", "Departments Profile", story)

def generate_insurance_policies(styles):
    story = []
    story.append(Paragraph("Insurance and Cashless Billing Policies", styles['HospitalTitle']))
    story.append(Paragraph("Apollo Hospitals supports a wide range of insurance providers and Third-Party Administrators (TPAs) to facilitate cashless healthcare for our patients.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("1. Cashless Admission Guidelines", styles['HospitalSubTitle']))
    story.append(Paragraph("To avail of cashless treatment, please submit pre-authorization documents at the TPA Desk (Ground Floor) within 24 hours of admission for planned treatments and within 12 hours for emergency admissions.", styles['HospitalBody']))
    story.append(Paragraph("Required documents: Aadhaar card or PAN card, corporate health card, original insurance policy, and doctor's admission slip.", styles['HospitalBody']))
    
    story.append(Paragraph("2. Room Rent Limitations", styles['HospitalSubTitle']))
    story.append(Paragraph("Insurance policies have limits on room rent categories. If a patient chooses a room category higher than what they are eligible for, the patient is liable to pay the difference in room rent as well as proportional incremental charges for investigations and doctors' visits.", styles['HospitalBody']))
    
    story.append(Paragraph("3. Supported Insurance Providers", styles['HospitalSubTitle']))
    insurers = [
        ("Star Health & Allied Insurance", "All cashless facilities, pre-auth approval takes 2-3 hours."),
        ("ICICI Lombard GIC", "Dedicated priority desk, cashless approved within 2 hours."),
        ("HDFC ERGO Health", "Supports corporate health plans, cashless available."),
        ("Niva Bupa Health Insurance", "Direct API integration, pre-auth processing is digital and fast."),
        ("United India / New India Assurance", "Supported via Government TPA desks, approval takes 3-4 hours.")
    ]
    for ins, details in insurers:
        story.append(Paragraph(f"<b>• {ins}:</b> {details}", styles['HospitalBody']))
        
    build_pdf("documents/Insurance_Policies.pdf", "Insurance Policies", story)

def generate_appointment_guide(styles):
    story = []
    story.append(Paragraph("Appointment Booking Guide", styles['HospitalTitle']))
    story.append(Paragraph("Patients can consult medical specialists at Apollo Hospitals by booking appointments through various channels. This guide details the appointment workflow.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("1. Booking Channels", styles['HospitalSubTitle']))
    story.append(Paragraph("Appointments can be booked online via our official portal (www.apollohospitals.com/appointments), our mobile application, or by calling our centralized booking line (+91 40 4344 0100).", styles['HospitalBody']))
    
    story.append(Paragraph("2. Check-In & Token Generation", styles['HospitalSubTitle']))
    story.append(Paragraph("On the day of your appointment, check in at the department reception counter 15 minutes prior to your slot. The system generates a token number, and live queue statuses are displayed outside the consulting cabins.", styles['HospitalBody']))
    
    story.append(Paragraph("3. Cancellation & Rescheduling", styles['HospitalSubTitle']))
    story.append(Paragraph("Appointments can be cancelled or rescheduled up to 2 hours before the scheduled time slot. Cancellations made inside the window receive a full refund, processed back to the patient's card/account in 5-7 working days.", styles['HospitalBody']))
    
    build_pdf("documents/Appointment_Guide.pdf", "Appointment Guide", story)

def generate_visitor_guidelines(styles):
    story = []
    story.append(Paragraph("Visitor Guidelines & Rules", styles['HospitalTitle']))
    story.append(Paragraph("To ensure a quiet, clean, and safe environment for our patients, all visitors are requested to strictly adhere to the hospital's visitation guidelines.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("1. Visiting Hours", styles['HospitalSubTitle']))
    story.append(Paragraph("<b>Inpatient Wards (General & Semi-Private):</b> 4:00 PM – 7:00 PM daily.<br/>"
                           "<b>Private and Deluxe Rooms:</b> 11:00 AM – 1:00 PM & 4:00 PM – 7:00 PM.<br/>"
                           "<b>ICU Visiting Hours:</b> 11:00 AM – 12:00 PM & 5:00 PM – 6:00 PM. Only 1 visitor is allowed inside the ICU cabin at a time for 5 minutes.", styles['HospitalBody']))
    
    story.append(Paragraph("2. Visitor Passes", styles['HospitalSubTitle']))
    story.append(Paragraph("Only one Attendant Pass and one Visitor Pass are issued per patient at the time of admission. Visitors must display their passes while inside the hospital premises.", styles['HospitalBody']))
    
    story.append(Paragraph("3. Infection Control & Safety", styles['HospitalSubTitle']))
    story.append(Paragraph("• Wash or sanitize hands before and after visiting a patient.<br/>"
                           "• Wearing a mask is mandatory for all visitors inside the wards.<br/>"
                           "• Children below 12 years are not allowed to visit inpatient wards to protect them from hospital-acquired infections.", styles['HospitalBody']))
    
    build_pdf("documents/Visitor_Guidelines.pdf", "Visitor Guidelines", story)

def generate_emergency_services(styles):
    story = []
    story.append(Paragraph("Emergency and Trauma Care Services", styles['HospitalTitle']))
    story.append(Paragraph("Apollo Emergency Care is a pioneer in modern emergency care in India. We operate a 24/7 emergency unit to provide immediate life-saving care.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("1. Contact Information", styles['EmergencyHeader']))
    story.append(Paragraph("<b>Central Emergency Hotline:</b> +91 99999 88888 (Open 24/7)<br/>"
                           "<b>Ambulance Dispatch:</b> +91 99999 77777", styles['HospitalBody']))
    
    story.append(Paragraph("2. Emergency Room Location", styles['HospitalSubTitle']))
    story.append(Paragraph("The Emergency Department is located on the Ground Floor of the main hospital building, with a dedicated driveway and entrance for ambulances and critical walk-ins.", styles['HospitalBody']))
    
    story.append(Paragraph("3. Emergency Triage System", styles['HospitalSubTitle']))
    story.append(Paragraph("Patients are triaged immediately upon arrival to prioritize care according to clinical severity:<br/>"
                           "• <b>Red Category (Immediate):</b> Life-threatening conditions (e.g. cardiac arrest, severe trauma, respiratory failure).<br/>"
                           "• <b>Yellow Category (Urgent):</b> Severe symptoms but stable vital signs (e.g. compound fractures, chest pains, high fever).<br/>"
                           "• <b>Green Category (Non-Urgent):</b> Minor injuries, cold/coughs, or simple dressings.", styles['HospitalBody']))
    
    build_pdf("documents/Emergency_Services.pdf", "Emergency Services", story)

def generate_hospital_faq(styles):
    story = []
    story.append(Paragraph("Apollo Hospital FAQ List", styles['HospitalTitle']))
    story.append(Paragraph("This document contains a comprehensive database of frequently asked questions and detailed answers regarding Apollo Hospital's services, appointments, billing, departments, and operations.", styles['HospitalBody']))
    story.append(Spacer(1, 10))
    
    faq_data = [
        # APPOINTMENTS
        ("How do I book an appointment?", "You can book an appointment online at our website www.apollohospitals.com, via the Apollo mobile app, or by calling our helpline at +91 40 4344 0100."),
        ("What are the outpatient (OP) timings?", "The Outpatient Department (OPD) clinics run from 9:00 AM to 8:00 PM, Monday to Saturday. Specific doctor timings are available in the Doctors Directory."),
        ("Can I walk in for an appointment?", "Yes, you can register as a walk-in patient at the registration counter. Walk-ins are accommodated after pre-booked online appointments."),
        ("How can I cancel my appointment?", "You can cancel your appointment through the patient portal, mobile app, or by calling +91 40 4344 0100 at least 2 hours prior to the slot."),
        ("Will I get a refund if I cancel my appointment?", "Yes, a full refund is credited back to your original payment method within 5-7 working days if cancelled at least 2 hours before the slot."),
        ("Can I reschedule my appointment?", "Yes, you can reschedule your appointment up to 1 hour before the scheduled time via the website, app, or helpline. You can reschedule up to two times."),
        ("How long is the consultation fee valid?", "The outpatient consultation fee is valid for 7 days, which includes one free follow-up session within that week."),
        
        # BILLING & INSURANCE
        ("Does the hospital provide cashless insurance?", "Yes, cashless facilities are available for major corporate policies and supported insurers. Please check with the TPA desk on the Ground floor."),
        ("Which insurance companies are supported?", "We support Star Health, ICICI Lombard, HDFC ERGO, Niva Bupa, Bajaj Allianz, Care Health, SBI General, United India, and New India Assurance."),
        ("What documents are required for admission?", "For admission, you need a doctor's admission slip, government-issued photo ID card, insurance card (if claiming cashless), and previous medical records."),
        ("What is the pre-authorization process for cashless claims?", "Submit the filled pre-auth form, photo ID, insurance card, and prescription to the TPA desk. The TPA desk files it with the insurer, and approval takes 2-4 hours."),
        ("What TPAs are associated with the hospital?", "We are associated with Medi Assist, Paramount, Vidal Health, and MDIndia TPAs."),
        ("Are registration fees covered under cashless insurance?", "No, registration fees, administrative charges, food for visitors, and toiletries are excluded from insurance and must be paid by the patient."),
        ("Can I pay my hospital bill using UPI?", "Yes, we accept payments via all UPI apps, Credit/Debit cards, Net Banking, and Cash."),
        ("Where are the billing counters located?", "Billing counters are located on the ground floor (near reception), 2nd floor, and 4th floor. The ground floor counter is open 24/7."),
        ("Can I get an itemized bill during my stay?", "Yes, you can request an interim itemized bill from the ward coordinator or the billing counter every alternate day."),
        ("How long does the discharge process take for cashless patients?", "It takes approximately 4 to 5 hours for cashless patients because the final bill must be approved by the insurance company prior to discharge."),
        
        # EMERGENCY & AMBULANCE
        ("How do I contact emergency services?", "For any emergency, immediately dial our 24/7 Emergency Hotline at +91 99999 88888."),
        ("Are ambulance services available 24/7?", "Yes, our fleet of advanced life support ambulances is available round the clock. Call +91 99999 77777 to dispatch one."),
        ("Is the ambulance service free?", "Ambulance service is free of charge for patients who get admitted to Apollo Hospital within a 5 km radius of the hospital."),
        ("Where is the emergency room located?", "The Emergency and Trauma Care unit is on the ground floor with a dedicated entrance on the left side of the main building."),
        ("What is the triaging system in Emergency?", "We categorize patients into Red (immediate life-threatening), Yellow (urgent but stable), and Green (non-urgent). Priority is given based on medical severity."),
        ("Is there a blood bank in the hospital?", "Yes, Apollo Blood Bank is located on the ground floor next to the emergency room and is open 24/7."),
        ("Can I get blood without replacement in an emergency?", "Yes, in life-threatening emergency situations, the blood bank will issue blood immediately on doctor's requisition without waiting for a donor."),
        ("How do I donate blood at Apollo?", "You can visit our blood bank between 9:00 AM and 6:00 PM on any day to donate blood. A donor card will be issued, which is valid for 1 year."),
        ("What is Code Blue?", "Code Blue is the emergency code for medical emergencies or cardiac arrests inside the hospital. Our resuscitation team responds within 90 seconds."),
        ("What is Code Red?", "Code Red indicates a fire emergency. Staff will guide you to safety using designated fire exits in a calm manner."),
        
        # VISITOR GUIDELINES
        ("What are the visiting hours for inpatient wards?", "Visiting hours for general wards are 4:00 PM to 7:00 PM. For private/semi-private rooms, they are 11:00 AM - 1:00 PM and 4:00 PM - 7:00 PM."),
        ("What are the ICU visiting hours?", "ICU visiting hours are restricted to 11:00 AM – 12:00 PM and 5:00 PM – 6:00 PM daily."),
        ("How many visitors are allowed in the ICU?", "Only one visitor is permitted inside the ICU at a time, for a maximum duration of 5 minutes per patient."),
        ("Are children allowed to visit patients?", "Children under 12 years are not allowed in the inpatient wards to prevent infection risks, unless special permission is granted by the ward supervisor."),
        ("Can I bring outside food for a patient?", "No, outside food is strictly prohibited. The hospital dietary department provides tailored meals to patients as prescribed by clinical nutritionists."),
        ("Where can visitors eat?", "Visitors can dine at the ground floor food court or the 5th floor cafeteria. Food is not permitted in the patient rooms/wards."),
        ("Is there parking available at the hospital?", "Yes, multi-level valet parking is available 24/7. Parking fees are INR 50 for the first 2 hours for four-wheelers."),
        ("Are masks mandatory for visitors?", "Yes, all visitors must wear a protective face mask and sanitize their hands at entry points to maintain hygiene."),
        ("Can I take photos/videos inside the hospital?", "No, photography and videography are strictly prohibited in wards, clinics, and operation theatres to protect privacy."),
        ("Is smoking allowed in the hospital campus?", "No, Apollo Hospital is a strictly smoke-free and tobacco-free zone. Smoking or using e-cigarettes is punishable by law.")
    ]

    # Dynamically generate detailed answers for specific doctors, cities, and timings to guarantee correct RAG answers
    doctors_info = [
        ("Dr. Vikram Reddy", "Cardiology", "Hyderabad", "Jubilee Hills", "Mon, Wed, Fri", "10:00 AM - 2:00 PM", "Room 201"),
        ("Dr. Anjali Sharma", "Cardiology", "Hyderabad", "Secunderabad", "Tue, Thu, Sat", "09:00 AM - 1:00 PM", "Room 202"),
        ("Dr. Priya Nair", "Cardiology", "Mumbai", "Navi Mumbai", "Tue, Thu, Sat", "11:00 AM - 3:00 PM", "Room 203"),
        ("Dr. Karthik Raja", "Cardiology", "Chennai", "Greams Road", "Mon, Wed, Fri", "3:00 PM - 6:00 PM", "Room 204"),
        ("Dr. Ramesh Krishnan", "Neurology", "Chennai", "Greams Road", "Mon-Fri", "10:00 AM - 1:00 PM", "Room 301"),
        ("Dr. Priya Nair", "Neurology", "Chennai", "Greams Road", "Tue, Thu, Sat", "02:00 PM - 5:00 PM", "Room 302"),
        ("Dr. Sanjay Sen", "Neurology", "Kolkata", "Gleneagles", "Mon-Wed", "9:00 AM - 12:00 PM", "Room 303"),
        ("Dr. Meera Deshmukh", "Neurology", "Mumbai", "Navi Mumbai", "Thu-Sat", "2:00 PM - 5:00 PM", "Room 304"),
        ("Dr. Sandeep Hegde", "Orthopedics", "Bangalore", "Bannerghatta Road", "Mon, Wed, Fri", "11:00 AM - 2:30 PM", "Room 105"),
        ("Dr. S. K. Prasad", "Orthopedics", "Vizag", "Arilova", "Mon-Sat", "04:00 PM - 6:00 PM", "Room 106"),
        ("Dr. Amit Patel", "Orthopedics", "Hyderabad", "Jubilee Hills", "Mon, Wed, Fri", "10:00 AM - 1:00 PM", "Room 107"),
        ("Dr. Sunita Rao", "Pediatrics", "Bangalore", "Jayanagar", "Mon-Sat", "10:00 AM - 1:00 PM", "Room 110"),
        ("Dr. Shalini Gupta", "Pediatrics", "Delhi", "Noida", "Mon-Fri", "3:00 PM - 7:00 PM", "Room 111"),
        ("Dr. Amit Shah", "Oncology", "Chennai", "Cancer Centre, Teynampet", "Mon, Wed, Fri", "01:00 PM - 3:00 PM", "Room 410"),
        ("Dr. Sameer Bhat", "Oncology", "Delhi", "Sarita Vihar", "Mon, Wed, Fri", "9:00 AM - 1:00 PM", "Room 411"),
        ("Dr. Rakesh Prasad", "Gastroenterology", "Hyderabad", "Jubilee Hills", "Mon, Wed, Fri", "10:00 AM - 1:00 PM", "Room 320"),
        ("Dr. Rajesh Kumar", "General Medicine", "Delhi", "Sarita Vihar", "Mon-Sat", "9:00 AM - 1:00 PM", "Room 101"),
        ("Dr. Anita Sharma", "General Medicine", "Bangalore", "Bannerghatta Road", "Mon-Fri", "2:00 PM - 6:00 PM", "Room 102")
    ]

    for dname, dept, city, branch, days, timings, room in doctors_info:
        # Add doctor availability query
        faq_data.append((
            f"Is {dname} available in {city}?",
            f"Yes, {dname} is available at the {branch} branch of Apollo Hospitals in {city}. He/She is a specialist in the {dept} department, consulting in {room} on {days} from {timings}."
        ))
        faq_data.append((
            f"What are the consulting hours of {dname} in {branch}?",
            f"{dname} consults in {room} on {days} from {timings} at our {branch} location in {city}."
        ))

    # Add city/branch specific availability queries
    branches_info = [
        ("Hyderabad", "Jubilee Hills, Secunderabad, and Hyderguda"),
        ("Chennai", "Greams Road, Thousand Lights, and Cancer Centre Teynampet"),
        ("Bangalore", "Bannerghatta Road, Jayanagar, and Sheshadripuram"),
        ("Delhi", "Sarita Vihar and Noida (NCR)"),
        ("Mumbai", "Navi Mumbai"),
        ("Vizag", "Arilova")
    ]
    for city, branch_list in branches_info:
        faq_data.append((
            f"Where are Apollo Hospitals located in {city}?",
            f"In {city}, Apollo Hospitals are located at: {branch_list}. For location-specific queries, you can contact the central helpdesk."
        ))
        faq_data.append((
            f"Which Cardiology doctors are in {city}?",
            f"In {city}, our Cardiology consultants include: " + ", ".join([d[0] for d in doctors_info if d[2].lower() == city.lower() and d[1].lower() == "cardiology"]) + "."
        ))

    # Add general checkup packages FAQ
    faq_data.append((
        "What are the checkup packages at Apollo?",
        "Apollo Hospitals offers Apollo Preventive Health Check-Up Packages (Basic, Executive, Cardiac, and Women's health). The Basic Health Check-up package costs INR 1,500 and includes blood tests, urine analysis, ECG, and general physical examination."
    ))

    # Append list of FAQs programmatically
    for idx, (q, a) in enumerate(faq_data):
        story.append(Paragraph(f"<b>{idx+1}. Q: {q}</b>", styles['HospitalFAQQuestion']))
        story.append(Paragraph(f"A: {a}", styles['HospitalFAQAnswer']))
        if (idx + 1) % 12 == 0:
            story.append(PageBreak())

    build_pdf("documents/Hospital_FAQ.pdf", "Hospital FAQ", story)


def main():
    # Make sure documents directory exists
    os.makedirs("documents", exist_ok=True)
    
    styles = get_styles()
    
    print("Generating Patient Guide...")
    generate_patient_guide(styles)
    
    print("Generating Doctors Directory...")
    generate_doctors_directory(styles)
    
    print("Generating Departments...")
    generate_departments(styles)
    
    print("Generating Insurance Policies...")
    generate_insurance_policies(styles)
    
    print("Generating Appointment Guide...")
    generate_appointment_guide(styles)
    
    print("Generating Visitor Guidelines...")
    generate_visitor_guidelines(styles)
    
    print("Generating Emergency Services...")
    generate_emergency_services(styles)
    
    print("Generating Hospital FAQ...")
    generate_hospital_faq(styles)
    
    print("PDF generation completed successfully.")

if __name__ == '__main__':
    main()
