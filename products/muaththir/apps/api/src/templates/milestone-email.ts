export interface MilestoneEmailData {
  parentName: string;
  childName: string;
  milestoneTitle: string;
  milestoneDescription: string;
  dimension: string;
}

function formatDimension(dimension: string): string {
  return dimension
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildMilestoneEmailHtml(data: MilestoneEmailData): string {
  const dimensionLabel = formatDimension(data.dimension);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestone Achieved</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:32px 24px;text-align:center;background-color:#4f46e5;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;">Milestone Achieved!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        <p style="font-size:16px;color:#333;">Dear ${escapeHtml(data.parentName)},</p>
        <p style="font-size:16px;color:#333;">
          Great news! <strong>${escapeHtml(data.childName)}</strong> has achieved a new milestone:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0f0ff;border-radius:8px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#4f46e5;">
                ${escapeHtml(data.milestoneTitle)}
              </p>
              <p style="margin:0 0 8px;font-size:14px;color:#666;">
                ${escapeHtml(data.milestoneDescription)}
              </p>
              <p style="margin:0;font-size:12px;color:#999;">
                Dimension: ${escapeHtml(dimensionLabel)}
              </p>
            </td>
          </tr>
        </table>
        <p style="font-size:14px;color:#666;">
          Keep tracking ${escapeHtml(data.childName)}'s progress on Muaththir to celebrate every achievement.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;text-align:center;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#999;">
          You received this because milestone alerts are enabled.
          Manage your notification preferences in your profile settings.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
