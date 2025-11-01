import { useEffect, useRef, useState } from 'react';
import { IconCamera, IconX } from '@tabler/icons-react';
import { ActionIcon, Button, Drawer } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { uploadPhoto } from '../../api/photoQueries';

interface CameraModalProps {
  opened: boolean;
  onClose: () => void;
}

const getErrorMessage = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return 'Не удалось получить доступ к камере';
  }
  const errors: Record<string, string> = {
    NotAllowedError: 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.',
    PermissionDeniedError: 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.',
    NotFoundError: 'Камера не найдена на устройстве',
    DevicesNotFoundError: 'Камера не найдена на устройстве',
    NotReadableError: 'Камера уже используется другим приложением',
    TrackStartError: 'Камера уже используется другим приложением',
  };
  return errors[err.name] || err.message || 'Не удалось получить доступ к камере';
};

export function CameraModal({ opened, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!opened) {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      try {
        setError(null);
        const constraints = [
          { video: { facingMode: 'environment' } },
          { video: { facingMode: 'user' } },
          { video: true },
        ];

        let stream: MediaStream | null = null;
        for (const constraint of constraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            break;
          } catch {
            continue;
          }
        }

        if (!stream) {
          throw new Error('Не удалось получить доступ к камере');
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current;
            if (!video) {
              reject(new Error('Video element not found'));
              return;
            }
            video.addEventListener(
              'loadedmetadata',
              () => video.play().then(resolve).catch(reject),
              { once: true }
            );
            video.addEventListener('error', () => reject(new Error('Video failed to load')), {
              once: true,
            });
          });
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        notifications.show({ title: 'Ошибка камеры', message: msg, color: 'red' });
      }
    };

    startCamera();
    return stopCamera;
  }, [opened]);

  const capturePhoto = async () => {
    if (!videoRef.current) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsLoading(false);
            setError('Не удалось создать изображение');
            return;
          }
          try {
            await uploadPhoto(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            notifications.show({
              title: 'Успешно',
              message: 'Фото успешно отправлено на сервер',
              color: 'green',
            });
            stopCamera();
            onClose();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Не удалось загрузить фото';
            setError(msg);
            notifications.show({ title: 'Ошибка', message: msg, color: 'red' });
          } finally {
            setIsLoading(false);
          }
        },
        'image/jpeg',
        0.9
      );
    } catch {
      setIsLoading(false);
      setError('Не удалось сделать фото');
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="Камера"
      position="bottom"
      size="100vh"
      styles={{ body: { backgroundColor: '#000', padding: 0, overflow: 'hidden' } }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '85vh',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {error && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#ff7428',
              backgroundColor: '#1a1a1a',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '2rem',
            right: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <ActionIcon
            size={60}
            radius="xl"
            color="#ff7428"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{ backgroundColor: '#2a2a2a' }}
            aria-label="Close camera"
          >
            <IconX size={28} stroke={2} color="#d9d9d9" />
          </ActionIcon>
          <Button
            size="xl"
            radius="xl"
            color="#ff7428"
            onClick={capturePhoto}
            loading={isLoading}
            disabled={!!error}
            leftSection={<IconCamera size={24} />}
            style={{ minWidth: '200px' }}
          >
            Сделать фото
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
