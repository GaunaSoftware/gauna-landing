import { issueGuideAccess } from '../src/lib/guide-access.mjs';
export const TEST_GUIDE_SECRET = 'TEST-ONLY-NOT-A-REAL-KEY';
export const accessData = { requestId: '61a5b88e-b767-4d64-abaf-635c7b0453b4', startedAt: Date.now() - 5000 };
export const guideAccess = issueGuideAccess(accessData, TEST_GUIDE_SECRET);
export const GUIDE_DOWNLOAD_URL = `https://gauna.es${guideAccess.downloadUrl}`;
export const GUIDE_OPEN_URL = `https://gauna.es${guideAccess.openUrl}`;
