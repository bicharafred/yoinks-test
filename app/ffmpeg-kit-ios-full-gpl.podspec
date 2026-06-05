Pod::Spec.new do |s|
  s.name         = "ffmpeg-kit-ios-full-gpl"
  s.version      = "6.0"
  s.summary      = "Local FFmpeg Kit for iOS"
  s.homepage     = "https://github.com/arthenica/ffmpeg-kit"
  s.author       = "Arthenica"

  # Aqui entra a mágica: o link direto para o .zip do Nooruddin
  s.source       = { :http => "https://github.com/NooruddinLakhani/ffmpeg-kit-ios-full-gpl/archive/refs/tags/latest.zip" }

  s.vendored_frameworks = "**/*.xcframework"
  s.platform     = :ios, "12.1"
end
