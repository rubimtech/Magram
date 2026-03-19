import { memo } from "react";
import Dialog, { DialogTitle, DialogContent, DialogContentBody, DialogButton } from "../../../UI/Dialog";
import { formatBytes } from "../../Message/MessageMedia";

function ExportComplete({ open, onClose, stats }) {
  const handleDownloadAgain = () => {
    if (stats?.blob) {
      const url = window.URL.createObjectURL(stats.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = stats.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog state={open} onClose={onClose}>
      <DialogTitle>Export Complete</DialogTitle>
      <DialogContent>
        <DialogContentBody>
          <div style={{ padding: '20px 0' }}>
            {stats?.type === 'history' ? (
              <><div style={{ fontSize: 32, fontWeight: 'bold', color: '#5caffa', marginBottom: 8 }}>{stats?.messageCount?.toLocaleString()}</div><div style={{ color: 'var(--dyn-text-color)', opacity: 0.7 }}>messages exported</div></>
            ) : (
              <><div style={{ fontSize: 32, fontWeight: 'bold', color: '#5caffa', marginBottom: 8 }}>{stats?.participantCount?.toLocaleString()}</div><div style={{ color: 'var(--dyn-text-color)', opacity: 0.7 }}>participants exported</div></>
            )}
            <div style={{ marginTop: 24, padding: 16, background: '#182533', borderRadius: 8, fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}><span style={{ opacity: 0.7 }}>File size: </span><span style={{ color: 'var(--dyn-text-color)' }}>{formatBytes(stats?.fileSize || 0)}</span></div>
              <div style={{ marginBottom: 8 }}><span style={{ opacity: 0.7 }}>Time: </span><span style={{ color: 'var(--dyn-text-color)' }}>{stats?.duration ? Math.round(stats.duration / 1000) : '?'}s</span></div>
              <div><span style={{ opacity: 0.7 }}>Format: </span><span style={{ color: 'var(--dyn-text-color)', textTransform: 'uppercase' }}>{stats?.format}</span></div>
            </div>
          </div>
        </DialogContentBody>
      </DialogContent>
      <DialogButton className="primary" onClick={handleDownloadAgain}>Download Again</DialogButton>
      <DialogButton className="Cancel" onClick={onClose}>Close</DialogButton>
    </Dialog>
  );
}

export default memo(ExportComplete);
