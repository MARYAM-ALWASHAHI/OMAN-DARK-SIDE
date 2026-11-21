#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"

class AOTDCharacter;

/**
 * On-screen touch buttons for phone/iPad: JUMP, RUN (toggle), CAMERA (FP/TP).
 * Movement and look use the engine's virtual joysticks (see Config/DefaultInput.ini).
 * Built in C++ Slate so it needs no editor assets; replace with a UMG widget during the UI milestone.
 */
class OMANDARKSIDE_API SOTDTouchControls : public SCompoundWidget
{
public:
	SLATE_BEGIN_ARGS(SOTDTouchControls) {}
		SLATE_ARGUMENT(TWeakObjectPtr<AOTDCharacter>, Character)
	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

private:
	TSharedRef<SWidget> MakeButton(const TAttribute<FText>& Label, FSimpleDelegate OnPressed, FSimpleDelegate OnReleased);

	FText GetRunLabel() const;
	FText GetCameraLabel() const;

	TWeakObjectPtr<AOTDCharacter> Character;
};
