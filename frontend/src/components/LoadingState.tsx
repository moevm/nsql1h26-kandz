import { LineWave } from 'react-loader-spinner';

interface LoadingStateProps {
  label?: string;
}

const LoadingState = ({ label = 'Загрузка данных' }: LoadingStateProps) => (
  <div className="loading-state" role="status" aria-live="polite">
    <LineWave
      visible
      height="54"
      width="54"
      color="#006a60"
      ariaLabel="line-wave-loading"
      firstLineColor="#006a60"
      middleLineColor="#2f5f9e"
      lastLineColor="#c14600"
    />
    <span>{label}</span>
  </div>
);

export default LoadingState;
