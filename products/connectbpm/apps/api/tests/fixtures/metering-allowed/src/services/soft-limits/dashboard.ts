/* eslint-disable */
// FIXTURE — the ONE legal use of UsageService: soft limits and dashboards.
import { UsageService } from '@connectsw/billing/backend';
export const softLimit = () => UsageService.peek('instances');
