import { memo, useState } from "react";
import { useDispatch } from "react-redux";
import Dialog, { DialogTitle, DialogContent, DialogContentBody, DialogButton } from "../../../UI/Dialog";
import { Radio, FormControlLabel, RadioGroup, Checkbox } from "@mui/material";
import { exportHistory, exportParticipants } from "../../../Util/export";
import { handleToast } from "../../../Stores/UI";

function ExportDialog({ open, onClose, chat, peer, type = 'history' }) {
  const dispatch = useDispatch();
  const [format, setFormat] = useState('json');
  const [includeMedia, setIncludeMedia] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ fetched: 0, total: 0, percent: 0 });

  const handleExport = async () => {
    setExporting(true);
    try {
      const chatId = String(peer.id.value);
      const options = { format, includeMedia, useCache, filter };
      const result = type === 'history'
        ? await exportHistory(chatId, peer, options, setProgress)
        : await exportParticipants(chatId, peer, options, setProgress);

      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      dispatch(handleToast({ icon: 'check_circle', title: 'Exported ' + (type === 'history' ? result.messages.length : result.participants.length) + ' items' }));
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      dispatch(handleToast({ icon: 'error', title: 'Export failed: ' + error.message }));
    } finally {
      setExporting(false);
    }
  };

  const labelStyle = { color: 'var(--dyn-text-color)', fontSize: 12, opacity: 0.7, marginBottom: 6, display: 'block', textAlign: 'left' };
  const groupStyle = { display: 'flex', flexDirection: 'column', gap: 0, textAlign: 'left', marginBottom: 12 };
  const rowStyle = { display: 'flex', gap: 16, textAlign: 'left' };

  return (
    <Dialog state={open} onClose={exporting ? null : onClose}>
      <DialogTitle>{type === 'history' ? 'Export Chat History' : 'Export Participants'}</DialogTitle>
      <DialogContent>
        <DialogContentBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, textAlign: 'left' }}>
            {type === 'history' ? (
              <>
                <div style={groupStyle}>
                  <span style={labelStyle}>Format</span>
                  <RadioGroup row value={format} onChange={(e) => setFormat(e.target.value)}>
                    <FormControlLabel value="json" control={<Radio size="small" />} label="JSON" />
                    <FormControlLabel value="csv" control={<Radio size="small" />} label="CSV" />
                    <FormControlLabel value="html" control={<Radio size="small" />} label="HTML" />
                  </RadioGroup>
                </div>
                <FormControlLabel
                  control={<Checkbox size="small" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} />}
                  label="Include media files"
                  style={{ color: 'var(--dyn-text-color)' }}
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={useCache} onChange={(e) => setUseCache(e.target.checked)} />}
                  label="Use cache (skip already downloaded)"
                  style={{ color: 'var(--dyn-text-color)' }}
                />
              </>
            ) : (
              <div style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <span style={labelStyle}>Format</span>
                  <RadioGroup value={format} onChange={(e) => setFormat(e.target.value)}>
                    <FormControlLabel value="json" control={<Radio size="small" />} label="JSON" />
                    <FormControlLabel value="csv" control={<Radio size="small" />} label="CSV" />
                  </RadioGroup>
                </div>
                <div style={{ flex: 2 }}>
                  <span style={labelStyle}>Filter</span>
                  <RadioGroup value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <FormControlLabel value="all" control={<Radio size="small" />} label="All participants" />
                    <FormControlLabel value="admins" control={<Radio size="small" />} label="Admins only" />
                    <FormControlLabel value="bots" control={<Radio size="small" />} label="Bots only" />
                  </RadioGroup>
                </div>
              </div>
            )}
            {exporting && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(var(--secondary-rgb),.3)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 6, color: 'var(--dyn-text-color)' }}>
                  {progress.percent}% — {progress.fetched} / {progress.total || '?'}
                </div>
                <div style={{ height: 4, background: 'rgba(0,0,0,.3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: progress.percent + '%', height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
          </div>
        </DialogContentBody>
      </DialogContent>
      <DialogButton className="primary" onClick={exporting ? undefined : handleExport}>{exporting ? 'Exporting...' : 'Start Export'}</DialogButton>
      <DialogButton className="Cancel" onClick={exporting ? undefined : onClose}>Cancel</DialogButton>
    </Dialog>
  );
}

export default memo(ExportDialog);
