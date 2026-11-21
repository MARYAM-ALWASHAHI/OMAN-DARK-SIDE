using UnrealBuildTool;

public class OmanDarkSideEditorTarget : TargetRules
{
	public OmanDarkSideEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("OmanDarkSide");
	}
}
