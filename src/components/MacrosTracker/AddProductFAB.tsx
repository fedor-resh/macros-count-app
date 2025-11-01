import { useState } from 'react';
import { IconBarcode, IconCamera, IconPlus, IconSearch } from '@tabler/icons-react';
import { ActionIcon, Transition } from '@mantine/core';
import { CameraModal } from './CameraModal';

interface AddProductFABProps {
  onAddProduct: () => void;
}

export function AddProductFAB({ onAddProduct }: AddProductFABProps) {
  const [fabExpanded, setFabExpanded] = useState(false);
  const [cameraOpened, setCameraOpened] = useState(false);

  const handleActionClick = () => {
    setFabExpanded(false);
    onAddProduct();
  };

  const handleCameraClick = () => {
    setFabExpanded(false);
    setCameraOpened(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        zIndex: 3,
      }}
    >
      {/* Circular Action Buttons */}
      <Transition mounted={fabExpanded} transition="pop" duration={200} timingFunction="ease">
        {(styles) => (
          <div
            style={{
              ...styles,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <ActionIcon
              size={50}
              radius="xl"
              onClick={handleActionClick}
              aria-label="Search product"
            >
              <IconSearch size={24} stroke={2} color="#2a2a2a" />
            </ActionIcon>
            <ActionIcon size={50} radius="xl" onClick={handleActionClick} aria-label="Scan barcode">
              <IconBarcode size={24} stroke={2} color="#2a2a2a" />
            </ActionIcon>
            <ActionIcon size={50} radius="xl" onClick={handleActionClick} aria-label="Add manually">
              <IconPlus size={24} stroke={2} color="#2a2a2a" />
            </ActionIcon>
            <ActionIcon size={50} radius="xl" onClick={handleCameraClick} aria-label="Open camera">
              <IconCamera size={24} stroke={2} color="#2a2a2a" />
            </ActionIcon>
          </div>
        )}
      </Transition>

      {/* Main FAB Button */}
      <ActionIcon
        size={60}
        radius="md"
        style={{
          transform: fabExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}
        aria-label={fabExpanded ? 'Close menu' : 'Add food item'}
        onClick={() => setFabExpanded(!fabExpanded)}
      >
        <IconPlus size={32} stroke={2} color="#2a2a2a" />
      </ActionIcon>

      <CameraModal opened={cameraOpened} onClose={() => setCameraOpened(false)} />
    </div>
  );
}
