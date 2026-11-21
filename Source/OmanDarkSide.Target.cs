using UnrealBuildTool;

public class OmanDarkSideTarget : TargetRules
{
	public OmanDarkSideTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("OmanDarkSide");
	}
}
