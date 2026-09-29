from typing import List
from app.models.enums import RiskLevel, DocumentReviewStatus
from app.models.models import Application

class RiskEngine:
    @staticmethod
    def calculate_priority(application: Application) -> RiskLevel:
        score = 0
        
        # Check activities
        activities = [a.activity_type.upper() for a in (application.activities or [])]
        if "MANUFACTURING" in activities or "PROCESSING" in activities:
            score += 2
        if "RESTAURANT" in activities or "CATERING" in activities:
            score += 1

        # Check investment amount
        if application.business and application.business.investment_amount:
            if application.business.investment_amount > 10000000:  # > 1 Crore
                score += 2
            elif application.business.investment_amount > 2500000:  # > 25 Lakhs
                score += 1

        # Check document rejections or corrections
        rejected_docs = [
            d for d in (application.documents or [])
            if d.review_status in (DocumentReviewStatus.REJECTED, DocumentReviewStatus.NEEDS_CORRECTION)
        ]
        if rejected_docs:
            score += 3

        # Open queries
        open_queries = [q for q in (application.queries or []) if q.status.value == "OPEN"]
        if open_queries:
            score += 2

        if score >= 5:
            return RiskLevel.HIGH
        elif score >= 2:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

risk_engine = RiskEngine()
