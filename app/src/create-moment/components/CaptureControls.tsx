import AlbumIcon from "@/assets/icons/album.svg";
import ArrowRepeatIcon from "@/assets/icons/arrow.repeat.svg";
import { MomentCameraControls } from "@/components/moment-create";

type Props = {
  isRecording: boolean;
  iconColor: string;
  onAlbumPress: () => void;
  onFlipPress: () => void;
  onShutterPress: () => void;
  onShutterLongPress: () => void;
  onShutterPressOut: () => void;
};

export function CaptureControls({
  isRecording,
  iconColor,
  onAlbumPress,
  onFlipPress,
  onShutterPress,
  onShutterLongPress,
  onShutterPressOut,
}: Props) {
  return (
    <MomentCameraControls
      albumIcon={<AlbumIcon width={24} height={24} color={iconColor} />}
      flipIcon={<ArrowRepeatIcon width={24} height={24} color={iconColor} />}
      isRecording={isRecording}
      onAlbumPress={onAlbumPress}
      onFlipPress={onFlipPress}
      onShutterPress={onShutterPress}
      onShutterLongPress={onShutterLongPress}
      onShutterPressOut={onShutterPressOut}
    />
  );
}
