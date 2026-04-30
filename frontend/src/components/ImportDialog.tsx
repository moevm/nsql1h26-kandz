import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { FileJson, LogIn, X } from 'lucide-react';
import { useAdminLoginMutation, useImportMutation } from '../hooks/useKanjiQueries';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (message: string) => void;
}

const ImportDialog = ({ open, onClose, onImported }: ImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const loginMutation = useAdminLoginMutation();
  const importMutation = useImportMutation();

  if (!open) {
    return null;
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    await loginMutation.mutateAsync({ username, password });
    setIsAuthorized(true);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const confirmed = window.confirm('Текущее содержимое учебной БД будет полностью заменено данными из файла.');

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    await importMutation.mutateAsync(file);
    onImported('Импорт завершён: данные заменены JSON-файлом.');
    event.target.value = '';
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Импорт данных">
      <div className="modal-sheet">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Mass import</p>
            <h2>Импорт JSON</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть импорт">
            <X size={20} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleLogin}>
          <label>
            Логин
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Пароль
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="admin123"
            />
          </label>

          {loginMutation.error ? <p className="error-text">{loginMutation.error.message}</p> : null}
          {importMutation.error ? <p className="error-text">{importMutation.error.message}</p> : null}

          <button className="filled-button" type="submit" disabled={loginMutation.isPending}>
            <LogIn size={18} />
            {isAuthorized ? 'Выбрать другой файл' : 'Войти и выбрать файл'}
          </button>
        </form>

        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
        />

        {isAuthorized ? (
          <button className="text-button import-file-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <FileJson size={18} />
            Открыть выбор файла
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ImportDialog;
