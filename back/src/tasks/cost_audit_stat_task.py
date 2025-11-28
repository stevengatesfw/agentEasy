from datetime import date, timedelta

from celery import shared_task

from parts.cost_audit.service import CostService


@shared_task
def daily_cost_audit_stat():
    """每日成本审计统计任务。

    这是一个 Celery 定时任务，用于执行每日的成本审计统计。
    计算前一天的应用使用成本统计，并缓存各时间段的统计数据。

    任务执行流程：
    1. 计算昨天的应用统计数据
    2. 缓存各时间段的统计数据用于快速查询
    """
    print("Starting daily cost audit statistics task")
    yesterday = date.today() - timedelta(days=1)
    CostService.daily_app_statistics(yesterday)
    CostService.cache_app_statistics_for_periods(yesterday)
    print(f"Completed daily cost audit statistics for {yesterday}")
