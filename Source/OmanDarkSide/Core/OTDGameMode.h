#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "OTDGameMode.generated.h"

/**
 * Base game mode for the vertical slice.
 * Milestone 1: only assigns the player pawn. Mission/save/world-state managers are added in later milestones.
 */
UCLASS()
class OMANDARKSIDE_API AOTDGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AOTDGameMode();
};
