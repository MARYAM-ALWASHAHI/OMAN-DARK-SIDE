#include "Core/OTDGameMode.h"
#include "Player/OTDCharacter.h"

AOTDGameMode::AOTDGameMode()
{
	DefaultPawnClass = AOTDCharacter::StaticClass();
}
