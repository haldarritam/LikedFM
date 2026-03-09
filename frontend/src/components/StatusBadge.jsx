export default function StatusBadge({ status }) {
  const statusConfig = {
    pending: {
      bg: 'bg-gray-700',
      text: 'text-gray-300',
      label: 'Pending',
      icon: '⏳',
    },
    downloading: {
      bg: 'bg-blue-700',
      text: 'text-blue-300',
      label: 'Downloading',
      icon: '⬇️',
      pulse: true,
    },
    downloaded: {
      bg: 'bg-green-700',
      text: 'text-green-300',
      label: 'Downloaded',
      icon: '✓',
    },
    failed: {
      bg: 'bg-red-700',
      text: 'text-red-300',
      label: 'Failed',
      icon: '✗',
    },
    ignored: {
      bg: 'bg-gray-600',
      text: 'text-gray-400',
      label: 'Ignored',
      icon: '◌',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${
        config.pulse ? 'animate-pulse' : ''
      } inline-flex items-center gap-1`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
