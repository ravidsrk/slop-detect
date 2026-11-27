class SlopDetect < Formula
  desc "Native zero-Node deterministic auditor for Design, Copy, DESIGN.md, Craft, and AEO"
  homepage "https://slop-detect.com"
  version "0.1.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/ravidsrk/slop-detect/releases/download/engine-v0.1.0/slop-detect-darwin-arm64"
      sha256 "PLACEHOLDER_RUN_RELEASE_ENGINE_WORKFLOW"
    else
      url "https://github.com/ravidsrk/slop-detect/releases/download/engine-v0.1.0/slop-detect-darwin-x64"
      sha256 "PLACEHOLDER_RUN_RELEASE_ENGINE_WORKFLOW"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/ravidsrk/slop-detect/releases/download/engine-v0.1.0/slop-detect-linux-arm64"
      sha256 "PLACEHOLDER_RUN_RELEASE_ENGINE_WORKFLOW"
    else
      url "https://github.com/ravidsrk/slop-detect/releases/download/engine-v0.1.0/slop-detect-linux-x64"
      sha256 "PLACEHOLDER_RUN_RELEASE_ENGINE_WORKFLOW"
    end
  end

  def install
    bin.install Dir["slop-detect-*"].first => "slop-detect"
  end

  test do
    assert_match "slop-detect-engine #{version}", shell_output("#{bin}/slop-detect engine-probe")
  end
end
