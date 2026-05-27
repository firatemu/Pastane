import { MediaGalleryManager } from '../../../components/media/media-gallery-manager';
import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';

export default async function MediaGalleryPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['media.view']);

  return <MediaGalleryManager permissions={session.permissions} />;
}
