import { Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const DEFAULT_MAX_CHARS = 250;

interface MomentCaptionPreviewProps {
  caption: string;
  maxChars?: number;
  onReadMore: () => void;
}

export const MomentCaptionPreview = ({
  caption,
  maxChars = DEFAULT_MAX_CHARS,
  onReadMore,
}: MomentCaptionPreviewProps) => {
  const isTruncated = caption.length > maxChars;

  if (!isTruncated) {
    return <Text style={styles.text}>{caption}</Text>;
  }

  return (
    <Text style={styles.text}>
      {caption.slice(0, maxChars).trimEnd() + "…"}
      <Text style={styles.readMore} onPress={onReadMore}>
        {" Read More"}
      </Text>
    </Text>
  );
};

const styles = StyleSheet.create((theme) => ({
  text: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 14, // raw — consistent with captionText in moment.tsx
    lineHeight: 20, // raw — 1.4× for readability
  },
  readMore: {
    color: theme.colors.foundation.foreground.brand.tertiary,
    fontSize: 14, // raw
    lineHeight: 20, // raw
    fontWeight: "600",
  },
}));
