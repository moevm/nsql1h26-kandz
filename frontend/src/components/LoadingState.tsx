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
      color="#0b57d0"
      ariaLabel="line-wave-loading"
      firstLineColor="#0b57d0"
      middleLineColor="#0b57d0"
      lastLineColor="#c5221f"
    />
    <span>{label}</span>
  </div>
);

export default LoadingState;
