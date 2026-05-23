import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { FileJson, X } from 'lucide-react';
import { useImportMutation } from '../hooks/useKanjiQueries';

interface ImportDialogProps {
  open: boolean;
  adminToken: string;
  onClose: () => void;
  onImported: (message: string) => void;
}

const ImportDialog = ({ open, adminToken, onClose, onImported }: ImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState('');
  const importMutation = useImportMutation();
  const isAuthorized = Boolean(adminToken);

  if (!open) {
    return null;
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLocalError('');

    if (!file) {
      return;
    }

    const confirmed = window.confirm('Текущее содержимое базы будет полностью заменено данными из файла.');

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    if (!adminToken) {
      setLocalError('Для импорта нужен вход администратора.');
      event.target.value = '';
      return;
    }

    try {
      await importMutation.mutateAsync({ file, token: adminToken });
      onImported('Импорт завершён: данные заменены JSON-файлом.');
      onClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Не удалось импортировать JSON.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Импорт данных">
      <div className="modal-sheet">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Импорт данных</p>
            <h2>Импорт JSON</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть импорт">
            <X size={20} />
          </button>
        </div>

        {isAuthorized ? (
          <div className="form-grid">
            <p className="muted-copy">
              Импорт полностью заменит текущую базу данными из выбранного JSON-файла.
            </p>

            {localError ? <p className="error-text">{localError}</p> : null}
            {importMutation.error ? <p className="error-text">{importMutation.error.message}</p> : null}

            <button className="filled-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
              <FileJson size={18} />
              Выбрать JSON
            </button>
          </div>
        ) : (
          <div className="form-grid">
            <p className="muted-copy">
              Для импорта нужен вход администратора. Войдите в панели слева, затем вернитесь к импорту.
            </p>
            <button className="text-button" type="button" onClick={onClose}>
              Понятно
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default ImportDialog;
